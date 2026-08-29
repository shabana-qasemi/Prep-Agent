import re
from state import MealPrepState

# Ingredient strings arrive as "<measure> <name>" (see mealplan.py's
# extract_ingredients), e.g. "200g Chicken breast". A plain set() dedupe only
# catches exact string matches, so the same ingredient with a different
# measure across recipes ("1 lb Chicken breast" elsewhere) shows up twice —
# the real reason grocery lists ballooned on longer plans. This splits off
# the measure so entries can be grouped by ingredient name instead.
# Order matters: regex alternation takes the first alternative that matches,
# not the longest, so a shorter word that's a prefix of a longer one (e.g.
# "l" is a prefix of "lb") must come AFTER it, or "1 lb Chicken" mis-splits
# into "1 l" + "b Chicken".
_UNIT_WORDS = (
    r"kg|mg|lb(?:s)?|g|ml|l|oz|cup(?:s)?|tbsp(?:s)?|tablespoons?|tsp(?:s)?|teaspoons?|"
    r"pinch(?:es)?(?: of)?|clove(?:s)?|slice(?:s)?|can(?:s)?|jar(?:s)?|packet(?:s)?|pkg|"
    r"bunch(?:es)?|sprig(?:s)?|stick(?:s)?|handful(?:s)?|to taste|as needed|for garnish"
)
_MEASURE_PREFIX = re.compile(
    rf"^(?P<measure>[\d./¼½¾⅓⅔\s-]*\s*(?:{_UNIT_WORDS})?\s*)(?P<name>[A-Za-z].*)$",
    re.IGNORECASE,
)


def _split_measure(item: str) -> tuple[str, str]:
    match = _MEASURE_PREFIX.match(item.strip())
    if not match or not match.group("name"):
        return "", item.strip()
    return match.group("measure").strip(), match.group("name").strip()


# Aisle grouping is a plain keyword lookup, not another LLM call — a longer
# plan already means more Groq calls elsewhere, and this doesn't need to be
# perfect to make a 60+ item list scannable. Order matters: earlier
# categories are checked first, which is how ambiguous words like "pepper"
# (bell pepper vs. ground pepper) get resolved.
CATEGORY_ORDER = [
    "Produce",
    "Meat & Seafood",
    "Dairy & Eggs",
    "Grains & Bread",
    "Canned & Pantry",
    "Condiments & Spices",
    "Frozen",
    "Other",
]

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Produce": [
        "onion", "garlic", "tomato", "potato", "carrot", "bell pepper", "lettuce", "spinach",
        "broccoli", "cucumber", "celery", "mushroom", "apple", "banana", "lemon", "lime",
        "avocado", "cabbage", "zucchini", "corn", "kale", "cilantro", "parsley", "leek",
        "scallion", "green onion", "chili pepper", "chilli", "jalapeno", "ginger root",
        "fresh ginger", "fresh basil",
    ],
    "Meat & Seafood": [
        "chicken", "beef", "pork", "lamb", "turkey", "bacon", "sausage", "ham", "fish",
        "salmon", "shrimp", "prawn", "tuna", "cod", "steak", "mince", "veal", "duck", "anchov",
    ],
    "Dairy & Eggs": [
        "milk", "cheese", "butter", "yogurt", "yoghurt", "cream", "egg", "parmesan",
        "mozzarella", "cheddar",
    ],
    "Grains & Bread": [
        "rice", "pasta", "bread", "flour", "oats", "oatmeal", "noodle", "tortilla", "quinoa",
        "cereal", "breadcrumb", "spaghetti", "macaroni", "bun", "bagel",
    ],
    "Canned & Pantry": [
        "canned", "beans", "lentil", "stock", "broth", "oil", "vinegar", "sugar", "honey",
        "syrup", "tomato paste", "coconut milk", "peanut butter", "nuts", "almond", "walnut",
        "raisin", "chocolate", "stock cube", "bouillon",
    ],
    "Condiments & Spices": [
        "salt", "pepper", "peppercorn", "cayenne", "cumin", "paprika", "cinnamon", "oregano",
        "thyme", "basil", "chili powder", "curry", "mustard", "ketchup", "mayonnaise",
        "soy sauce", "hot sauce", "vanilla", "baking powder", "baking soda", "nutmeg",
        "turmeric", "garlic powder", "onion powder", "sauce", "spice", "seasoning",
    ],
    "Frozen": ["frozen"],
}


def _categorize(name: str) -> str:
    lowered = name.lower()
    for category in CATEGORY_ORDER[:-1]:
        if any(keyword in lowered for keyword in _CATEGORY_KEYWORDS[category]):
            return category
    return "Other"


def grocery_agent(state: MealPrepState) -> dict:
    all_items = []
    for day_data in (state.meal_plan or {}).values():
        for meal in day_data["meals"]:
            all_items.extend(meal.get("ingredients", []))

    grouped: dict[str, tuple[str, set[str]]] = {}
    for item in all_items:
        measure, name = _split_measure(item)
        key = name.lower()
        if key not in grouped:
            grouped[key] = (name, set())
        if measure:
            grouped[key][1].add(measure)

    lines_by_name: dict[str, str] = {}
    for name, measures in grouped.values():
        measures_sorted = sorted(measures)
        if not measures_sorted:
            lines_by_name[name] = name
        elif len(measures_sorted) == 1:
            lines_by_name[name] = f"{measures_sorted[0]} {name}"
        else:
            lines_by_name[name] = f"{name} — {', '.join(measures_sorted)}"

    grocery_list = sorted(lines_by_name.values(), key=str.lower)

    categories: dict[str, list[str]] = {}
    for name, line in lines_by_name.items():
        categories.setdefault(_categorize(name), []).append(line)
    for items in categories.values():
        items.sort(key=str.lower)
    grocery_categories = {cat: categories[cat] for cat in CATEGORY_ORDER if cat in categories}

    return {"grocery_list": grocery_list, "grocery_categories": grocery_categories}
