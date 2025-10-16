
const API_KEY = "3053470440ee93f2e4c17285cc4a2687";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

const filtersData = { genreMap: {}, countryList: [], yearList: [] };
let currentLang = localStorage.getItem("lang") || "ru";
let currentPage = 1;
let totalPages = 1;
let currentQuery = localStorage.getItem("query") || "";
const selectedFilters = {
  genre: new Set(JSON.parse(localStorage.getItem("filter_genre") || "[]")),
  country: new Set(JSON.parse(localStorage.getItem("filter_country") || "[]")),
  year: new Set(JSON.parse(localStorage.getItem("filter_year") || "[]"))
};

const translations = {
  ru: {
    filters: "Фильтры",
    all: "Все",
    apply: "Применить",
    moviesNotFound: "Фильмы не найдены",
    genre: "Жанры",
    country: "Страны",
    year: "Год",
    search: "Поиск фильмов...",
    prev: "Назад",
    next: "Вперёд",
    page: "Страница",
    trailer: "Смотреть трейлер"
  },
  en: {
    filters: "Filters",
    all: "All",
    apply: "Apply",
    moviesNotFound: "Movies not found",
    genre: "Genres",
    country: "Countries",
    year: "Year",
    search: "Search movies...",
    prev: "Prev",
    next: "Next",
    page: "Page",
    trailer: "Watch trailer"
  }
};

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

const suggestionsBox = document.createElement("ul");
suggestionsBox.className = "suggestions";
movieSearchInput.parentNode.appendChild(suggestionsBox);
movieSearchInput.value = currentQuery;

function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const debouncedSearch = debounce(fetchMovies, 500);

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
    saveFilters();
    optionsContainer.querySelectorAll("input").forEach(cb => (cb.checked = false));
    updateHeader(header, id);
    fetchMovies(1);
  });

  applyBtn.addEventListener("click", () => {
    selectedFilters[id].clear();
    optionsContainer.querySelectorAll("input:checked").forEach(cb => {
      selectedFilters[id].add(cb.value);
    });
    saveFilters();
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
    if (selectedFilters[id].has(opt)) input.checked = true;
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
    card.dataset.id = movie.id;

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

    card.addEventListener("click", () => openModal(movie.id));
    movieContainer.appendChild(card);
  });
  renderPagination();
}

function renderPagination() {
  pagination.innerHTML = "";
  const maxButtons = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);

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

async function fetchMovies(page = 1) {
  currentPage = page;
  let url;
  if (currentQuery) {
    url = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=${currentLang}-RU&query=${encodeURIComponent(currentQuery)}&page=${page}`;
  } else {
    url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=${currentLang}-RU&page=${page}`;
    if (selectedFilters.genre.size > 0) {
      const ids = Array.from(selectedFilters.genre)
        .map(g => Object.keys(filtersData.genreMap).find(id => filtersData.genreMap[id] === g))
        .join(",");
      url += `&with_genres=${ids}`;
    }
    if (selectedFilters.year.size > 0) url += `&primary_release_year=${Array.from(selectedFilters.year)[0]}`;
    if (selectedFilters.country.size > 0) url += `&region=${Array.from(selectedFilters.country)[0]}`;
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
  updateSuggestions(movies);
}

function saveFilters() {
  localStorage.setItem("filter_genre", JSON.stringify([...selectedFilters.genre]));
  localStorage.setItem("filter_country", JSON.stringify([...selectedFilters.country]));
  localStorage.setItem("filter_year", JSON.stringify([...selectedFilters.year]));
}

function updateLanguage() {
  sidebar.querySelector(".filters-title").textContent = translations[currentLang].filters;
  movieSearchInput.placeholder = translations[currentLang].search;
  renderPagination();
}

langToggle.checked = currentLang === "en";
langToggle.addEventListener("change", () => {
  currentLang = langToggle.checked ? "en" : "ru";
  localStorage.setItem("lang", currentLang);
  updateLanguage();
  fetchMovies(1);
});

themeBtn.addEventListener("click", () => {
  body.classList.toggle("dark-theme");
  body.classList.toggle("light-theme");
  if (body.classList.contains("dark-theme")) {
    filterToggle.style.backgroundColor = "#ffb84d";
    filterToggle.style.color = "#222";
  } else {
    filterToggle.style.backgroundColor = "#ff6600";
    filterToggle.style.color = "#fff";
  }
  localStorage.setItem("theme", body.classList.contains("dark-theme") ? "dark" : "light");
});

if (localStorage.getItem("theme") === "light") {
  body.classList.remove("dark-theme");
  body.classList.add("light-theme");
  filterToggle.style.backgroundColor = "#ff6600";
  filterToggle.style.color = "#fff";
} else {
  body.classList.add("dark-theme");
  filterToggle.style.backgroundColor = "#ffb84d";
  filterToggle.style.color = "#222";
}

filterToggle.addEventListener("click", toggleSidebar);
hamburger.addEventListener("click", toggleSidebar);

function toggleSidebar() {
  const isActive = sidebar.classList.toggle("active");
  mainContent.classList.toggle("shifted", isActive);
  filterToggle.classList.toggle("hidden", isActive);
  body.classList.toggle("filters-open", isActive);
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && sidebar.classList.contains("active")) toggleSidebar();
});

document.addEventListener("click", e => {
  if (sidebar.classList.contains("active") && !sidebar.contains(e.target) && e.target !== filterToggle && e.target !== hamburger) {
    toggleSidebar();
  }
});

movieSearchInput.addEventListener("input", e => {
  currentQuery = e.target.value;
  localStorage.setItem("query", currentQuery);
  debouncedSearch(1);
});

function updateSuggestions(movies) {
  suggestionsBox.innerHTML = "";
  if (!currentQuery.trim()) {
    suggestionsBox.classList.remove("active");
    return;
  }
  movies.slice(0, 6).forEach(movie => {
    const li = document.createElement("li");
    li.textContent = movie.title;
    li.addEventListener("click", () => {
      movieSearchInput.value = movie.title;
      currentQuery = movie.title;
      localStorage.setItem("query", currentQuery);
      fetchMovies(1);
      suggestionsBox.classList.remove("active");
    });
    suggestionsBox.appendChild(li);
  });
  suggestionsBox.classList.add("active");
}

async function openModal(id) {
  const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=${currentLang}-RU&append_to_response=videos`);
  const movie = await res.json();

  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <div class="modal-body">
        <img src="${movie.poster_path ? IMG_URL + movie.poster_path : "assets/no-poster.jpg"}" alt="${movie.title}">
        <div class="modal-info">
          <h3>${movie.title}</h3>
          <p>${movie.overview || "Описание отсутствует"}</p>
          <p><strong>Год:</strong> ${movie.release_date ? movie.release_date.split("-")[0] : "—"}</p>
          <p><strong>Рейтинг:</strong> ${movie.vote_average}</p>
          ${movie.videos.results.length ? `<button class="trailer-btn">${translations[currentLang].trailer}</button>` : ""}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector(".close").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });

  const trailerBtn = modal.querySelector(".trailer-btn");
  if (trailerBtn && movie.videos.results.length) {
    trailerBtn.addEventListener("click", () => {
      const trailer = movie.videos.results.find(v => v.site === "YouTube");
      if (trailer) window.open(`https://www.youtube.com/watch?v=${trailer.key}`, "_blank");
    });
  }
}

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

(async function init() {
  await loadFilters();
  await fetchMovies();
  updateLanguage();
})();
