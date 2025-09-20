//Конфиг
const API_KEY = "3053470440ee93f2e4c17285cc4a2687";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

//Данные фильтров
const filtersData = {
  genreMap: {},
  countryList: [],
  yearList: []
};

//Переводы
const translations = {
  ru: {
    filters: "Фильтры",
    all: "Все",
    apply: "Применить",
    moviesNotFound: "Фильмы не найдены",
    genre: "Жанры",
    country: "Страны",
    year: "Год",
    search: "Поиск...",
    prev: "Назад",
    next: "Вперёд",
    page: "Страница"
  },
  en: {
    filters: "Filters",
    all: "All",
    apply: "Apply",
    moviesNotFound: "Movies not found",
    genre: "Genres",
    country: "Countries",
    year: "Year",
    search: "Search...",
    prev: "Prev",
    next: "Next",
    page: "Page"
  }
};

let currentLang = "ru";
let currentPage = 1;
let totalPages = 1;
let currentQuery = "";
const selectedFilters = {
  genre: new Set(),
  country: new Set(),
  year: new Set()
};

//DOM элементы
const movieContainer = document.getElementById("movieContainer");
const sidebar = document.getElementById("sidebar");
const mainContent = document.querySelector(".main-content");
const themeBtn = document.getElementById("themeToggle");
const body = document.body;
const langToggle = document.getElementById("langToggle");
const filterToggle = document.getElementById("filterToggle");
const hamburger = document.getElementById("hamburger");
const movieSearchInput = document.getElementById("movieSearch");
const pagination = document.getElementById("pagination");

//Дебаунс
function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
const debouncedSearch = debounce(fetchMovies, 500);

//Dropdown
function createDropdown(id, title, options = []) {
  const group = document.createElement("div");
  group.className = "filter-group";

  const h4 = document.createElement("h4");
  h4.textContent = title;
  h4.dataset.key = id;
  group.appendChild(h4);

  const dropdown = document.createElement("div");
  dropdown.className = "filter-dropdown";
  dropdown.id = id;

  const header = document.createElement("div");
  header.className = "dropdown-header";
  header.tabIndex = 0;
  header.setAttribute("role", "button");
  header.setAttribute("aria-expanded", "false");

  const labelSpan = document.createElement("span");
  labelSpan.className = "dropdown-label";
  labelSpan.textContent = translations[currentLang].all;
  const iconSpan = document.createElement("span");
  iconSpan.className = "dropdown-icon";

  header.appendChild(labelSpan);
  header.appendChild(iconSpan);
  dropdown.appendChild(header);

  const body = document.createElement("div");
  body.className = "dropdown-body";

  const optionsContainer = document.createElement("div");
  optionsContainer.className = "dropdown-options";
  body.appendChild(optionsContainer);

  const footer = document.createElement("div");
  footer.className = "dropdown-footer";

  const resetBtn = document.createElement("button");
  resetBtn.className = "btn-outline reset";
  resetBtn.textContent = translations[currentLang].all;

  const applyBtn = document.createElement("button");
  applyBtn.className = "btn-primary apply";
  applyBtn.textContent = translations[currentLang].apply;

  footer.appendChild(resetBtn);
  footer.appendChild(applyBtn);
  body.appendChild(footer);

  dropdown.appendChild(body);
  group.appendChild(dropdown);
  sidebar.appendChild(group);

  updateDropdownOptions(id, options);

  header.addEventListener("click", () => toggleDropdown(dropdown, header));

  resetBtn.addEventListener("click", () => {
    selectedFilters[id].clear();
    optionsContainer.querySelectorAll("input").forEach(cb => (cb.checked = false));
    updateHeader(header, id);
    fetchMovies(1);
  });

  applyBtn.addEventListener("click", () => {
    selectedFilters[id].clear();
    optionsContainer.querySelectorAll("input:checked").forEach(cb => {
      selectedFilters[id].add(cb.value);
    });
    updateHeader(header, id);
    dropdown.classList.remove("open");
    header.setAttribute("aria-expanded", "false");
    fetchMovies(1);
  });
}

function updateDropdownOptions(id, options) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return;
  const container = dropdown.querySelector(".dropdown-options");
  container.innerHTML = "";
  options.forEach(opt => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = opt;
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${opt}`));
    container.appendChild(label);
  });
}

function toggleDropdown(dropdown, header) {
  document.querySelectorAll(".filter-dropdown.open").forEach(d => {
    if (d !== dropdown) d.classList.remove("open");
  });
  const isOpen = dropdown.classList.toggle("open");
  header.setAttribute("aria-expanded", isOpen);
}

function updateHeader(header, id) {
  const label = header.querySelector(".dropdown-label");
  label.textContent =
    selectedFilters[id].size === 0
      ? translations[currentLang].all
      : Array.from(selectedFilters[id]).join(", ");
}

//Рендер фильмов
function renderMovies(movies) {
  movieContainer.innerHTML = "";

  if (movies.length === 0) {
    const p = document.createElement("p");
    p.textContent = translations[currentLang].moviesNotFound;
    movieContainer.appendChild(p);
    return;
  }

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = movie.img;
    img.alt = movie.title;
    card.appendChild(img);

    const title = document.createElement("h3");
    title.textContent = movie.title;
    card.appendChild(title);

    const info = document.createElement("p");
    info.textContent = `${movie.genres.join(", ")}, ${movie.year}`;
    card.appendChild(info);

    movieContainer.appendChild(card);
  });

  renderPagination();
}

//Пагинация
function renderPagination() {
  pagination.innerHTML = "";

  const maxButtons = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + maxButtons - 1);

  if (end - start < maxButtons - 1) {
    start = Math.max(1, end - maxButtons + 1);
  }

  const prevBtn = document.createElement("button");
  prevBtn.textContent = translations[currentLang].prev;
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => fetchMovies(currentPage - 1));
  pagination.appendChild(prevBtn);

  for (let i = start; i <= end; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => fetchMovies(i));
    pagination.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = translations[currentLang].next;
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () => fetchMovies(currentPage + 1));
  pagination.appendChild(nextBtn);
}

//API запрос
async function fetchMovies(page = 1) {
  currentPage = page;
  let url;

  if (currentQuery) {
    url = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=${currentLang}-RU&query=${encodeURIComponent(
      currentQuery
    )}&page=${page}`;
  } else {
    url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=${currentLang}-RU&page=${page}`;

    if (selectedFilters.genre.size > 0) {
      const ids = Array.from(selectedFilters.genre)
        .map(g => Object.keys(filtersData.genreMap).find(id => filtersData.genreMap[id] === g))
        .join(",");
      url += `&with_genres=${ids}`;
    }
    if (selectedFilters.year.size > 0) {
      url += `&primary_release_year=${Array.from(selectedFilters.year)[0]}`;
    }
    if (selectedFilters.country.size > 0) {
      url += `&region=${Array.from(selectedFilters.country)[0]}`;
    }
  }

  const res = await fetch(url);
  const data = await res.json();
  totalPages = data.total_pages;

  const movies = data.results.map(m => ({
    id: m.id,
    title: m.title,
    genres: m.genre_ids.map(id => filtersData.genreMap[id] || "—"),
    year: m.release_date ? m.release_date.split("-")[0] : "—",
    img: m.poster_path ? `${IMG_URL}${m.poster_path}` : "assets/no-poster.jpg"
  }));

  renderMovies(movies);
}

//Язык
function updateLanguage() {
  sidebar.querySelector(".filters-title").textContent = translations[currentLang].filters;
  movieSearchInput.placeholder = translations[currentLang].search;
  renderPagination();
}

langToggle.addEventListener("change", () => {
  currentLang = langToggle.checked ? "en" : "ru";
  updateLanguage();
  fetchMovies(1);
});

//Темы
themeBtn.addEventListener("click", () => {
  body.classList.toggle("dark-theme");
  body.classList.toggle("light-theme");
});

//Хедер анимация
filterToggle.addEventListener("click", toggleSidebar);
hamburger.addEventListener("click", toggleSidebar);

function toggleSidebar() {
  const isActive = sidebar.classList.toggle("active");
  mainContent.classList.toggle("shifted", isActive);
  filterToggle.classList.toggle("hidden", isActive);

  //скрываем хедер
  if (isActive) {
    body.classList.add("filters-open");
  } else {
    body.classList.remove("filters-open");
  }
}

//ESC и клик
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
    mainContent.classList.remove("shifted");
    filterToggle.classList.remove("hidden");
    body.classList.remove("filters-open");
  }
});

document.addEventListener("click", e => {
  if (sidebar.classList.contains("active") && !sidebar.contains(e.target) && e.target !== filterToggle && e.target !== hamburger) {
    sidebar.classList.remove("active");
    mainContent.classList.remove("shifted");
    filterToggle.classList.remove("hidden");
    body.classList.remove("filters-open");
  }
});

//Поиск
movieSearchInput.addEventListener("input", e => {
  currentQuery = e.target.value;
  debouncedSearch(1);
});

//Genres, Countries, Years
async function loadFilters() {
  const genresRes = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=ru-RU`);
  const genresData = await genresRes.json();
  genresData.genres.forEach(g => (filtersData.genreMap[g.id] = g.name));
  createDropdown("genre", translations[currentLang].genre, genresData.genres.map(g => g.name));

  const countriesRes = await fetch(`${BASE_URL}/configuration/countries?api_key=${API_KEY}`);
  const countriesData = await countriesRes.json();
  filtersData.countryList = countriesData.map(c => c.iso_3166_1);
  createDropdown("country", translations[currentLang].country, filtersData.countryList);

  const thisYear = new Date().getFullYear();
  filtersData.yearList = Array.from({ length: 50 }, (_, i) => (thisYear - i).toString());
  createDropdown("year", translations[currentLang].year, filtersData.yearList);
}

//Инициализация
(async function init() {
  await loadFilters();
  await fetchMovies();
  updateLanguage();
})();
