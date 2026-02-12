import { useMemo, useState } from 'react';

const SAMPLE_RECIPES = [
  {
    id: 1,
    title: 'Lemon Garlic Salmon',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    readyInMinutes: 25,
    servings: 2,
    cuisine: 'Mediterranean',
    dietary: ['gluten-free', 'pescatarian'],
    ingredients: ['salmon fillets', 'lemon', 'garlic', 'olive oil', 'asparagus'],
    instructions: [
      'Preheat oven to 400°F (200°C).',
      'Season salmon with lemon zest, garlic, olive oil, salt, and pepper.',
      'Roast salmon and asparagus for 12-15 minutes until flaky.',
      'Serve with a squeeze of lemon juice.'
    ],
    nutrition: '420 kcal • 32g protein • 10g carbs • 24g fat'
  },
  {
    id: 2,
    title: 'Veggie Power Bowl',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
    readyInMinutes: 30,
    servings: 2,
    cuisine: 'Californian',
    dietary: ['vegan', 'gluten-free'],
    ingredients: ['quinoa', 'chickpeas', 'avocado', 'spinach', 'sweet potato'],
    instructions: [
      'Roast sweet potatoes until tender.',
      'Cook quinoa and warm chickpeas with spices.',
      'Assemble bowls with greens, quinoa, chickpeas, and avocado.',
      'Finish with lemon-tahini dressing.'
    ],
    nutrition: '510 kcal • 18g protein • 72g carbs • 18g fat'
  },
  {
    id: 3,
    title: 'Chicken Tikka Wraps',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    readyInMinutes: 35,
    servings: 4,
    cuisine: 'Indian',
    dietary: ['high-protein'],
    ingredients: ['chicken thighs', 'yogurt', 'tikka spice', 'naan', 'cucumber'],
    instructions: [
      'Marinate chicken in yogurt and tikka spice.',
      'Grill until cooked through.',
      'Warm naan and assemble with cucumber and herbs.',
      'Serve with yogurt sauce.'
    ],
    nutrition: '580 kcal • 42g protein • 48g carbs • 24g fat'
  }
];

const DIETARY_OPTIONS = ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'keto', 'pescatarian'];
const STORAGE_KEY = 'recipePlanner';

const getStoredState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { favorites: [], mealPlan: {}, shoppingList: [] };
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { favorites: [], mealPlan: {}, shoppingList: [] };
  }
};

const setStoredState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const getUpcomingDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const id = date.toISOString().split('T')[0];
    days.push({
      id,
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    });
  }
  return days;
};

const mergeUnique = (items, additions) => {
  const set = new Set(items);
  additions.forEach((item) => set.add(item));
  return Array.from(set);
};

const formatCuisine = (value) => (value ? value[0].toUpperCase() + value.slice(1) : '');

const apiKey = import.meta.env.VITE_SPOONACULAR_KEY;

export default function App() {
  const [query, setQuery] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [dietary, setDietary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recipes, setRecipes] = useState(SAMPLE_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState(SAMPLE_RECIPES[0]);
  const [storageState, setStorageState] = useState(getStoredState());
  const [selectedDay, setSelectedDay] = useState(getUpcomingDays()[0].id);

  const favoritesSet = useMemo(() => new Set(storageState.favorites), [storageState.favorites]);

  const updateStorage = (updates) => {
    const nextState = { ...storageState, ...updates };
    setStorageState(nextState);
    setStoredState(nextState);
  };

  const handleDietaryToggle = (value) => {
    setDietary((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const runSearch = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    if (!apiKey) {
      const filtered = SAMPLE_RECIPES.filter((recipe) => {
        const matchesQuery = query
          ? recipe.title.toLowerCase().includes(query.toLowerCase())
          : true;
        const matchesCuisine = cuisine
          ? recipe.cuisine.toLowerCase().includes(cuisine.toLowerCase())
          : true;
        const matchesDietary = dietary.length
          ? dietary.every((diet) => recipe.dietary.includes(diet))
          : true;
        const matchesIngredients = ingredients
          ? ingredients
              .split(',')
              .map((item) => item.trim().toLowerCase())
              .every((item) => recipe.ingredients.join(' ').toLowerCase().includes(item))
          : true;
        return matchesQuery && matchesCuisine && matchesDietary && matchesIngredients;
      });
      setRecipes(filtered.length ? filtered : SAMPLE_RECIPES);
      setSelectedRecipe(filtered.length ? filtered[0] : SAMPLE_RECIPES[0]);
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        apiKey,
        query,
        cuisine,
        includeIngredients: ingredients,
        diet: dietary.join(','),
        number: '8'
      });
      const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`);
      const data = await response.json();
      const mapped = data.results?.map((item) => ({
        id: item.id,
        title: item.title,
        image: item.image,
        readyInMinutes: item.readyInMinutes,
        servings: item.servings,
        cuisine: item.cuisines?.[0] || 'Global',
        dietary: item.diets || [],
        ingredients: [],
        instructions: [],
        nutrition: 'See full nutrition on detail'
      }));
      if (mapped?.length) {
        setRecipes(mapped);
        await handleSelectRecipe(mapped[0]);
      }
    } catch (error) {
      setRecipes(SAMPLE_RECIPES);
      setSelectedRecipe(SAMPLE_RECIPES[0]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRecipe = async (recipe) => {
    if (!apiKey) {
      setSelectedRecipe(recipe);
      return;
    }

    try {
      const response = await fetch(
        `https://api.spoonacular.com/recipes/${recipe.id}/information?apiKey=${apiKey}&includeNutrition=true`
      );
      const data = await response.json();
      const ingredientsList = data.extendedIngredients?.map((item) => item.original) ?? [];
      const instructions = data.analyzedInstructions?.[0]?.steps?.map((step) => step.step) ?? [];
      const calories = data.nutrition?.nutrients?.find((item) => item.name === 'Calories');
      const protein = data.nutrition?.nutrients?.find((item) => item.name === 'Protein');
      const carbs = data.nutrition?.nutrients?.find((item) => item.name === 'Carbohydrates');
      const fat = data.nutrition?.nutrients?.find((item) => item.name === 'Fat');

      setSelectedRecipe({
        ...recipe,
        ingredients: ingredientsList,
        instructions,
        nutrition: [
          calories && `${Math.round(calories.amount)} ${calories.unit} calories`,
          protein && `${Math.round(protein.amount)}${protein.unit} protein`,
          carbs && `${Math.round(carbs.amount)}${carbs.unit} carbs`,
          fat && `${Math.round(fat.amount)}${fat.unit} fat`
        ]
          .filter(Boolean)
          .join(' • ')
      });
    } catch (error) {
      setSelectedRecipe(recipe);
    }
  };

  const handleFavoriteToggle = (recipeId) => {
    const nextFavorites = favoritesSet.has(recipeId)
      ? storageState.favorites.filter((id) => id !== recipeId)
      : [...storageState.favorites, recipeId];
    updateStorage({ favorites: nextFavorites });
  };

  const handlePlanRecipe = (recipe) => {
    const dayPlan = storageState.mealPlan[selectedDay] || [];
    const nextDayPlan = mergeUnique(dayPlan, [recipe.id]);
    updateStorage({ mealPlan: { ...storageState.mealPlan, [selectedDay]: nextDayPlan } });
  };

  const handleAddShoppingItems = (recipe) => {
    const nextList = mergeUnique(storageState.shoppingList, recipe.ingredients);
    updateStorage({ shoppingList: nextList });
  };

  const handleRemoveShoppingItem = (item) => {
    updateStorage({
      shoppingList: storageState.shoppingList.filter((entry) => entry !== item)
    });
  };

  const plannedRecipes = (dateId) =>
    (storageState.mealPlan[dateId] || []).map((recipeId) =>
      recipes.find((recipe) => recipe.id === recipeId)
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-sm text-emerald-400">Recipe Finder & Meal Planner</p>
            <h1 className="text-3xl font-semibold">Plan your week with smart recipes.</h1>
          </div>
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm">
            {apiKey
              ? 'Connected to Spoonacular API'
              : 'Using sample data — add VITE_SPOONACULAR_KEY to unlock live recipes'}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <form
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/40"
            onSubmit={runSearch}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Find recipes</h2>
                <p className="text-sm text-slate-400">
                  Search by ingredients, cuisine, or dietary preferences.
                </p>
              </div>
              <button
                type="submit"
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                {isLoading ? 'Searching...' : 'Search recipes'}
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                Keyword
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="e.g. salmon, curry"
                />
              </label>
              <label className="space-y-2 text-sm">
                Ingredients (comma separated)
                <input
                  value={ingredients}
                  onChange={(event) => setIngredients(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="e.g. chickpeas, spinach"
                />
              </label>
              <label className="space-y-2 text-sm">
                Cuisine
                <input
                  value={cuisine}
                  onChange={(event) => setCuisine(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="e.g. Italian, Thai"
                />
              </label>
              <div className="space-y-2 text-sm">
                Dietary preferences
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleDietaryToggle(option)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                        dietary.includes(option)
                          ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                          : 'border-slate-700 text-slate-300 hover:border-emerald-300'
                      }`}
                    >
                      {formatCuisine(option)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recipes</h2>
              <span className="text-sm text-slate-400">{recipes.length} matches</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {recipes.map((recipe) => (
                <button
                  type="button"
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  className={`flex w-full flex-col overflow-hidden rounded-xl border text-left transition hover:border-emerald-400 ${
                    selectedRecipe?.id === recipe.id
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-950/60'
                  }`}
                >
                  <img src={recipe.image} alt={recipe.title} className="h-32 w-full object-cover" />
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold">{recipe.title}</h3>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                        {recipe.readyInMinutes} min
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{recipe.cuisine}</p>
                    <div className="flex flex-wrap gap-2">
                      {recipe.dietary.slice(0, 3).map((diet) => (
                        <span
                          key={diet}
                          className="rounded-full bg-slate-800/70 px-2 py-1 text-[10px] uppercase text-slate-300"
                        >
                          {diet}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedRecipe && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{selectedRecipe.title}</h2>
                  <p className="text-sm text-slate-400">
                    {selectedRecipe.readyInMinutes} min • serves {selectedRecipe.servings}
                  </p>
                  <p className="mt-2 text-sm text-emerald-300">{selectedRecipe.nutrition}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleFavoriteToggle(selectedRecipe.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      favoritesSet.has(selectedRecipe.id)
                        ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                        : 'border-slate-700 text-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    {favoritesSet.has(selectedRecipe.id) ? 'Saved to favorites' : 'Save favorite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlanRecipe(selectedRecipe)}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Add to plan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddShoppingItems(selectedRecipe)}
                    className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400"
                  >
                    Add ingredients
                  </button>
                </div>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                    Instructions
                  </h3>
                  <ol className="mt-3 space-y-3 text-sm text-slate-200">
                    {selectedRecipe.instructions.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-200">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                    Ingredients
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {selectedRecipe.ingredients.map((ingredient) => (
                      <li key={ingredient} className="flex items-center justify-between gap-2">
                        <span>{ingredient}</span>
                        <span className="text-xs text-slate-500">✓</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-xl font-semibold">Favorites</h2>
            <div className="mt-4 space-y-3">
              {storageState.favorites.length === 0 && (
                <p className="text-sm text-slate-400">No favorites yet. Save recipes you love.</p>
              )}
              {storageState.favorites.map((id) => {
                const recipe = recipes.find((item) => item.id === id) ||
                  SAMPLE_RECIPES.find((item) => item.id === id);
                if (!recipe) return null;
                return (
                  <div key={recipe.id} className="flex items-center justify-between text-sm">
                    <span>{recipe.title}</span>
                    <button
                      type="button"
                      className="text-emerald-300"
                      onClick={() => handleFavoriteToggle(recipe.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Meal plan</h2>
                <p className="text-sm text-slate-400">Plan your week in one glance.</p>
              </div>
              <select
                value={selectedDay}
                onChange={(event) => setSelectedDay(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              >
                {getUpcomingDays().map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 space-y-4">
              {getUpcomingDays().map((day) => (
                <div key={day.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">{day.label}</p>
                  <div className="mt-2 space-y-2 text-sm text-slate-200">
                    {(plannedRecipes(day.id) || []).length === 0 && (
                      <p className="text-xs text-slate-500">Add recipes to plan.</p>
                    )}
                    {(plannedRecipes(day.id) || []).map((recipe) =>
                      recipe ? (
                        <div key={recipe.id} className="flex items-center justify-between">
                          <span>{recipe.title}</span>
                          <button
                            type="button"
                            className="text-xs text-emerald-300"
                            onClick={() => handleAddShoppingItems(recipe)}
                          >
                            Add ingredients
                          </button>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-xl font-semibold">Shopping list</h2>
            <p className="text-sm text-slate-400">Auto-generated from meal plan.</p>
            <div className="mt-4 space-y-2 text-sm">
              {storageState.shoppingList.length === 0 && (
                <p className="text-xs text-slate-500">No items yet. Add ingredients from recipes.</p>
              )}
              {storageState.shoppingList.map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <span>{item}</span>
                  <button
                    type="button"
                    className="text-xs text-emerald-300"
                    onClick={() => handleRemoveShoppingItem(item)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-6 text-center text-xs text-slate-500">
        Save favorites, build a weekly plan, and export your list in seconds.
      </footer>
    </div>
  );
}
