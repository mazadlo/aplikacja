function switchForm() {
    document.getElementById('loginForm').classList.toggle('active');
    document.getElementById('registerForm').classList.toggle('active');
  }

  function togglePassword(...ids) {
    ids.forEach(id => {
      const field = document.getElementById(id);
      field.type = field.type === 'password' ? 'text' : 'password';
    });
  }

  function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
      alert("Wypełnij wszystkie pola.");
      return;
    }

    // Ukryj formularze logowania/rejestracji
    /*document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.querySelector('.auth-wrapper').style.display = 'none';*/
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.remove('active');
    document.querySelector('.auth-wrapper').style.display = 'none';

    // Pokaż główny widok
    document.getElementById('mainView').style.display = 'flex'; // lub 'block', zależnie od layoutu
    document.getElementById('sideMenu').style.display = 'block';

    alert(`Zalogowano jako ${username} (symulacja)`);
  }
    
  function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (!username || !email || !password || !confirm) {
      alert("Wszystkie pola są wymagane.");
      return;
    }

    if (password !== confirm) {
      alert("Hasła nie są takie same.");
      return;
    }

    alert(`Zarejestrowano użytkownika ${username} (symulacja)`);

    // Automatycznie przełącz na formularz logowania
    switchForm();
  }

    let currentView = "mainView";

    function showSearchView() {
      document.getElementById("mainView").style.display = "none";
  if (document.getElementById("calendarView")) {
    document.getElementById("calendarView").style.display = "none";
  }
  document.getElementById("searchView").style.display = "flex";
    }
    function goBackToMain() {
    document.querySelector('#searchView').style.display = 'none';
    document.querySelector('#mainView').style.display = 'flex';
    }
    function openPlantModal(tile, isFromMainView = false) {
    const name = tile.dataset.name;

    document.getElementById('plant-name').textContent = name;

    document.querySelector('.add-plant-btn').style.display = isFromMainView ? 'none' : 'block';
    document.querySelector('.confirm-edit-btn').style.display = isFromMainView ? 'block' : 'none';
    document.querySelector('.plant-details-modal').style.display = 'block';

    document.getElementById('mainView').style.display = 'none';
    document.getElementById('searchView').style.display = 'flex';
    }

    function closePlantModal() {
    document.querySelector('.plant-details-modal').style.display = 'none';
    }

      function addPlantToGrid() {
      const name = document.getElementById('plant-name').textContent;
      const description = document.getElementById('plant-description').textContent;
    
      const tile = document.createElement('div');
      tile.classList.add('plant-tile');
      tile.dataset.name = name;
      tile.dataset.description = description;
    
      tile.onclick = function () {
        openPlantModal(this, true);
      };
    
      document.getElementById('mainPlantGrid').appendChild(tile);
      document.getElementById('nocontent').style.display = 'none';
      closePlantModal();
      document.getElementById('searchView').style.display = 'none';
      document.getElementById('mainView').style.display = 'flex';
    
      savePlantReminders(name); // ⬅️ dodane
    }
    
function confirmEdit() {
  const name = document.getElementById('plant-name').textContent;
  savePlantReminders(name); // nadpisz stare
  closePlantModal();
}



function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  menu.classList.toggle("active");
}

function showOnly(viewIdToShow) {
  const views = ["mainView", "calendarView"];
  views.forEach(id => {
    const view = document.getElementById(id);
    if (view) {
      view.style.display = id === viewIdToShow ? "flex" : "none";
    }
  });

  // Ukryj niezależne komponenty
  document.querySelector('.plant-details-modal').style.display = 'none';
  document.getElementById("searchView").style.display = "none";
}

function goToMainView() {
  showOnly("mainView");
  toggleMenu();
}

function goToCalendarView() {
  showOnly("calendarView");
  toggleMenu();
  renderCalendar(currentDate);
}

const calendar = document.getElementById('calendar');
const monthYearDisplay = document.getElementById('monthYear');
let currentDate = new Date();

function renderCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = `
    <div class="weekday">pn.</div>
    <div class="weekday">wt.</div>
    <div class="weekday">śr.</div>
    <div class="weekday">czw.</div>
    <div class="weekday">pt.</div>
    <div class="weekday">sb.</div>
    <div class="weekday">ndz.</div>
  `;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Nagłówek
  document.getElementById("monthYear").textContent = currentDate.toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  for (let i = 0; i < startDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.classList.add("day");
    calendar.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement("div");
    dayCell.classList.add("day");

    const cellDate = new Date(year, month, day);
    const today = new Date();
    if (
      cellDate.getDate() === today.getDate() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getFullYear() === today.getFullYear()
    ) {
      dayCell.classList.add("today");
    }

    dayCell.innerHTML = `<div>${day}</div>`;
    dayCell.dataset.date = cellDate.toISOString().split("T")[0];
    calendar.appendChild(dayCell);
  }

  renderReminders();
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar();
}


function getIconsForDate(date) {
  let icons = "";

  reminders.forEach(reminder => {
    reminder.items.forEach(item => {
      const start = new Date(reminder.startDate);
      const diff = Math.floor((date - start) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff % item.freq === 0) {
        icons += `<img class="calendar-icon" src="${item.icon}" title="${item.type}" />`;
      }
    });
  });

  return icons;
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar(currentDate);
}

function switchView(viewId) {
  const allViews = document.querySelectorAll('.app-view');
  allViews.forEach(view => {
    view.style.display = view.id === viewId ? 'flex' : 'none';
  });

  currentView = viewId;
  document.getElementById("sideMenu").classList.remove("active");
}

  const searchInput = document.getElementById("plantSearchInput");
  const plantGrid = document.getElementById("plantGrid");

  let searchTimeout;

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();

    if (query.length < 2) {
      plantGrid.innerHTML = ""; // Wyczyść siatkę
      return;
    }

    // Delay aby ograniczyć ilość zapytań
    searchTimeout = setTimeout(() => {
      searchPlants(query);
    }, 300);
  });

  async function searchPlants(query) {
    plantGrid.innerHTML = "<p>Ładowanie...</p>";

    try {
      // 🔸 PRZYKŁAD dla API Perenual
      // const url = `https://perenual.com/api/v2/species-list?key=sk-UOVF683c539984c7610790&q=${encodeURIComponent(query)}`;
      // const res = await fetch(url);
      // const json = await res.json();

      // const plants = json.data || [];

      // renderPlantTiles(plants);
      const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();

      // Backend zwraca obiekty z nazwą rośliny i źródłem
      const plants = json;

      renderMergedPlantTiles(plants);

    } catch (err) {
      plantGrid.innerHTML = "<p>Błąd ładowania roślin.</p>";
      console.error(err);
    }
  }

  function renderPlantTiles(plants) {
    plantGrid.innerHTML = "";

    if (plants.length === 0) {
      plantGrid.innerHTML = "<p>Brak wyników.</p>";
      return;
    }

    plants.forEach((plant) => {
      const tile = document.createElement("div");
      tile.className = "plant-tile";
      tile.dataset.name = plant.common_name || "Brak nazwy";

      tile.onclick = function () {
        document.getElementById("plant-name").textContent = plant.common_name || "Brak nazwy";
        document.getElementById("plant-description").innerHTML = `
          <ul>
            <li>Rodzaj: ${plant.genus || 'brak'}</li>
            <li>Nazwa naukowa: ${plant.scientific_name || 'brak'}</li>
          </ul>
        `;
        openPlantModal(tile, false);
      };

      // Zawartość kafelka
      tile.innerHTML = `
        <div style="text-align:center;">
          <img src="${plant.default_image?.thumbnail || 'ikona_szara.jpg'}" alt="${plant.common_name}" style="max-width: 100%; max-height: 100px; border-radius: 10px;">
          <div style="margin-top: 10px; font-size: 1.2rem;">${plant.common_name || "Brak nazwy"}</div>
        </div>
      `;

      plantGrid.appendChild(tile);
    });
  }

// WERSJA DO OPISU

    function renderMergedPlantTiles(plants) {
      plantGrid.innerHTML = "";
    
      if (plants.length === 0) {
        plantGrid.innerHTML = "<p>Brak wyników.</p>";
        return;
      }
    
      plants.forEach((plant) => {
        const tile = document.createElement("div");
        tile.className = "plant-tile";
        tile.dataset.name = plant.name || "Brak nazwy";
    
        tile.onclick = async function () {
          try {
            const response = await fetch(`/plant/${plant.id}`);
            const data = await response.json();
        
            if (data.error) {
              alert("Nie udało się pobrać danych rośliny.");
              return;
            }
        
            currentSearchedPlant = data; // ⬅️ Zapisz dane rośliny do zmiennej globalnej
        
            document.getElementById("plant-name").textContent = data.name || "Brak nazwy";
        
            const imageBox = document.querySelector(".plant-image-box");
            imageBox.innerHTML = "";
            const img = document.createElement("img");
            img.src = data.image;
            img.alt = data.name;
            img.style.maxWidth = "100%";
            img.style.maxHeight = "100%";
            img.style.objectFit = "cover";
            imageBox.appendChild(img);
        
            document.getElementById("plant-description").innerHTML = `
              <ul>
                <li><strong>Ilość światła:</strong> ${data.sunlight}</li>
                <li><strong>Typ gleby:</strong> ${data.soil}</li>
                <li><strong>Odporność na suszę:</strong> ${data.drought_tolerance}</li>
                <li><strong>Tempo wzrostu:</strong> ${data.growth_rate}</li>
                <li><strong>Maksymalna wysokość:</strong> ${data.mature_height}</li>
                <li><strong>Kolor liści/kwiatów:</strong> ${data.leaf_color}${data.flower_color ? ` / ${data.flower_color}` : ""}</li>
              </ul>
            `;
        
            openPlantModal(tile, false);
          } catch (error) {
            console.error("Błąd podczas ładowania szczegółów rośliny", error);
            alert("Wystąpił błąd.");
          }
        };
        
    
        tile.innerHTML = `
        <div style="text-align:center;">
          <div style="margin-top: 10px; font-size: 1.2rem;">${plant.name}</div>
        </div>
      `;
    
        plantGrid.appendChild(tile);
      });
    }

    let reminders = [];
    function renderReminders() {
      const icons = {
        watering: "podlewanie.jpg",
        pruning: "przycinanie.jpg",
        sunlight: "swiatlo.jpg",
        life_cycle: "cykl.jpg"
      };

      const monthMap = {
        january: "styczeń",
        february: "luty",
        march: "marzec",
        april: "kwiecień",
        may: "maj",
        june: "czerwiec",
        july: "lipiec",
        august: "sierpień",
        september: "wrzesień",
        october: "październik",
        november: "listopad",
        december: "grudzień"
      };

      const today = new Date();
      document.querySelectorAll(".day").forEach(cell => {
        const dateStr = cell.dataset.date;
        if (!dateStr) return;
    
        const date = new Date(dateStr);
        const content = document.createElement("div");
        content.className = "day-content";
        const iconMap = {}; // { watering: [roslina1, roslina2], ... }
    
        remindersData.forEach(reminder => {
          const start = new Date(reminder.addedAt);
          const daysDiff = Math.floor((date - start) / (1000 * 60 * 60 * 24));
    
          reminder.selected.forEach(type => {
          let shouldShow = false;

          if (type === "watering") {
            const minDays = reminder.details?.watering?.range?.min || 3;
            if (daysDiff >= 0 && daysDiff % minDays === 0) shouldShow = true;
          }

          if (type === "pruning") {
            //const period = reminder.details?.pruning?.period || "";
            //const pruningMonths = period.split(",").map(m => m.trim().toLowerCase());
            const period = reminder.details?.pruning?.period || "";
            const pruningMonths = period.split(",")
              .map(m => monthMap[m.trim().toLowerCase()] || m.trim().toLowerCase()); // tłumaczenie do PL
            const monthName = date.toLocaleString("pl-PL", { month: "long" }).toLowerCase();
            if (pruningMonths.includes(monthName)) shouldShow = true;
          }

          if (type === "sunlight") {
            // Pokazujemy pierwszego dnia po dodaniu (można rozbudować o inne zasady)
            if (daysDiff === 0) shouldShow = true;
          }

          if (type === "life_cycle") {
            // Przypomnienie raz w miesiącu
            if (daysDiff % 30 === 0) shouldShow = true;
          }

          if (shouldShow) {
            if (!iconMap[type]) iconMap[type] = [];
            iconMap[type].push(reminder.name);
          }
        });
      });

        // Dodaj ikony z tooltipami
        for (const [type, plantNames] of Object.entries(iconMap)) {
          const wrapper = document.createElement("div");
          wrapper.className = "icon-with-tooltip";

          const img = document.createElement("img");
          img.src = icons[type];
          img.alt = type;
          img.className = "calendar-icon";

          const tooltip = document.createElement("div");
          tooltip.className = "custom-tooltip";
          tooltip.textContent = plantNames.join(", ");

          wrapper.appendChild(img);
          wrapper.appendChild(tooltip);
          content.appendChild(wrapper);
        }        
        cell.appendChild(content);
      });
    }
    
    
    let remindersData = [];

function savePlantReminders(name) {
  //const selected = [...document.querySelectorAll('.plant-checkbox:checked')].map(cb => cb.dataset.type);

  //remindersData = remindersData.filter(r => r.name !== name); // usuń stare dane
  //remindersData.push({ name, selected, addedAt: new Date() });
  //renderCalendar(); // odśwież kalendarz

  const selected = [...document.querySelectorAll('.plant-checkbox:checked')].map(cb => cb.dataset.type);

  // Rozszerzamy obiekt o szczegóły z back-endu
  const details = {
    watering: {
      frequency: currentSearchedPlant.watering_frequency,
      range: currentSearchedPlant.watering_range,
      time: currentSearchedPlant.watering_time
    },
    pruning: {
      frequency: currentSearchedPlant.pruning_frequency,
      period: currentSearchedPlant.pruning_period
    },
    life_cycle: currentSearchedPlant.cycle,
    sunlight: currentSearchedPlant.sunlight,
  };

  remindersData = remindersData.filter(r => r.name !== name); // usuń stare dane

  remindersData.push({
    name,
    selected,
    addedAt: new Date(),
    details
  });

  renderCalendar();

} 

function logout() {
  if (confirm("Czy na pewno chcesz się wylogować?")) {
    localStorage.removeItem("user");

    // Ukryj widoki aplikacji
    document.querySelectorAll(".app-view").forEach(view => {
      view.style.display = "none";
    });

    // Ukryj formularz rejestracji i wyłącz klasę active z niego
    document.getElementById("registerForm").classList.remove("active");

    // Pokaż formularz logowania i dodaj klasę active
    const loginForm = document.getElementById("loginForm");
    loginForm.classList.add("active");

    // Pokaż kontener formularzy
    const authWrapper = document.querySelector(".auth-wrapper");
    if (authWrapper) {
      authWrapper.style.display = "";  // albo '' jeśli chcesz używać CSS domyślnego
    }
    // Wyczyść pola formularza logowania
    document.getElementById("loginUsername").value = "";
    document.getElementById("loginPassword").value = "";
  }
}


