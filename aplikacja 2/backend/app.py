# POBIERA Z DANYM DO KALENDARZA
from flask import Flask, request, jsonify, render_template, redirect, url_for, flash
from flask_cors import CORS
import os
import requests
# import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from forms import LoginForm, RegisterForm
from models import db, User

# cache przechowywanie danych o roślinie
plant_cache = {}
CACHE_DURATION = timedelta(hours=6)

load_dotenv()

# app = Flask(__name__, static_folder="../FLOROWNIK", static_url_path="/")
app = Flask(__name__, template_folder='templates')
CORS(app)  # Pozwala frontendowi się łączyć

# logowanie
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
# print("SECRET_KEY:", app.config['SECRET_KEY'])
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'instance', 'users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
app.config['WTF_CSRF_ENABLED'] = True

PERENUAL_KEY = os.getenv("PERENUAL_API_KEY")
TREFLE_KEY = os.getenv("TREFLE_API_KEY")

# --- Setup sessions with retry ---
def create_session():
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    return session

trefle_session = create_session()
perenual_session = create_session()

# inicjalizacja bazy danych, importuj db z models.py
db.init_app(app)

# menadżer logowania
login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_for('florownik'))
    else:
        return redirect(url_for('login'))

@app.route("/search")
def search_plants():
    query = request.args.get("q", "")
    if not query:
        return jsonify([])

    results = []
    seen_names = set()

    try:
        trefle_url = f"https://trefle.io/api/v1/plants?token={TREFLE_KEY}&q={query}"
        trefle_res = trefle_session.get(trefle_url)
        print(f"Trefle status: {trefle_res.status_code}")
        print("Trefle Pozostałe zapytania:", trefle_res.headers.get("X-RateLimit-Remaining"))
        
        if trefle_res.status_code == 200:
            
            try:
                trefle_data = trefle_res.json()
            except ValueError:
                print("! Trefle zwrócił niepoprawny JSON")
                trefle_data = {}

            for plant in trefle_data.get("data", []):
                name = plant.get("common_name") or plant.get("scientific_name") or "Unknown"
                if name.lower() not in seen_names:
                    seen_names.add(name.lower())
                    image_url = plant.get("image_url", "")
                    results.append({
                        "id": plant.get("id"),
                        "name": name,
                        "image": image_url
                    })

        elif trefle_res.status_code == 429:
            retry_after = trefle_res.headers.get("Retry-After", "60")
            print(f"Limit zapytań Trefle. Spróbuj ponownie za {retry_after} sekund.")
        else:
            print("Trefle error:", trefle_res.text)

    except Exception as e:
        print("Trefle Pozostałe zapytania: ",trefle_res.headers.get("X-RateLimit-Remaining"))
        print("Limit zapytań Trefle. Spróbuj ponownie za: ", trefle_res.headers.get("Retry-After"))
        print(f"Błąd zapytania do Trefle: {e}")

    # --- Perenual API (wyszukiwanie)
    try:
        perenual_url = f"https://perenual.com/api/v2/species-list?key={PERENUAL_KEY}&q={query}"
        perenual_res = perenual_session.get(perenual_url)
        print(f"Perenual status: {perenual_res.status_code}")

        if perenual_res.status_code == 200:
            try:
                perenual_data = perenual_res.json()
            except ValueError:
                print("Perenual zwrócił niepoprawny JSON")
                perenual_data = {}

            for plant in perenual_data.get("data", []):
                name = plant.get("common_name") or "Unknown"
                if name.lower() not in seen_names:
                    seen_names.add(name.lower())
                    results.append({
                        "id": plant.get("id"),
                        "name": name,
                        "image": plant.get("default_image", {}).get("regular_url", "")
                    })
        elif perenual_res.status_code == 429:
            retry_after = perenual_res.headers.get("Retry-After", "60")
            print(f"Limit zapytań Perenual. Spróbuj ponownie za {retry_after} sekund.")
        else:
            perenual_data = {}
            print("Perenual error:", perenual_res.text)
    
    except Exception as e:
        print("Perenual Pozostałe zapytania: ", perenual_res.headers.get("X-RateLimit-Remaining"))
        print("Limit zapytań Perenual. Spróbuj ponownie za: ", perenual_res.headers.get("Retry-After"))
        print(f"Błąd zapytania do Perenual: {e}")

    def relevance_score(plant):
        name = plant["name"].lower()
        if name == query.lower():
            return 0  # najwyższa trafność
        elif query.lower() in name:
            return 1  # częściowe dopasowanie
        else:
            return 2  # słabe dopasowanie

    # def relevance_score(plant):
    #     name = plant["name"].lower()
    #     if name == query.lower():
    #         return 0
    #     elif name.startswith(query.lower()):
    #         return 1
    #     elif query.lower() in name:
    #         return 2
    #     else:
    #         return 3

    results.sort(key=relevance_score)
    return jsonify(results)

def safe_get(d, key, default=None):
    """
    Bezpieczne pobieranie wartości z obiektu d spod klucza key,
    tylko jeśli d jest słownikiem.
    """
    if isinstance(d, dict):
        return d.get(key, default)
    return default

def safe_join(value, sep=", ", default="brak"):
    """
    Jeśli wartość jest listą, łączy ją w string, 
    jeśli nie — zwraca default.
    """
    if isinstance(value, list) and value:
        return sep.join(str(v) for v in value)
    elif isinstance(value, str):
        return value
    return default

@app.route("/plant/<int:plant_id>")
def plant_details(plant_id):
    # Sprawdź cache
    if plant_id in plant_cache:
        cached_time, cached_data = plant_cache[plant_id]
        if datetime.now() - cached_time < CACHE_DURATION:
            print(f"Zwracam z cache ID {plant_id}")
            return jsonify(cached_data)
        else:
            print(f"Cache wygasł dla ID {plant_id}")
    
    try:
        url = f"https://perenual.com/api/v2/species/details/{plant_id}?key={PERENUAL_KEY}"
        res = perenual_session.get(url)

        if res.status_code == 429:  # Too Many Requests
            retry_after_header = res.headers.get("Retry-After", "1")
            try:
                retry_after = int(retry_after_header)
            except ValueError:
                retry_after = 5
            print(f"! Ograniczenie zapytań - retry after {retry_after} sekund")
            return jsonify({"error": f"Ograniczenie zapytań, spróbuj ponownie za {retry_after} sekund"}), 429

        if res.status_code != 200:
            print(f"! API zwróciło błąd HTTP {res.status_code} dla ID {plant_id}")
            return jsonify({"error": "Roślina nie istnieje lub brak danych"}), 404

        try:
            raw_data = res.json()
            # print(f"Odebrano dane (typ {type(raw_data)}): {raw_data}")
            # print("DEBUG JSON:", json.dumps(raw_data, indent=2))

            # Konwersja listy na dict, jeśli trzeba
            if isinstance(raw_data, list):
                if raw_data:
                    data = raw_data[0]
                else:
                    print("! Pusta lista — brak danych.")
                    return jsonify({"error": "Brak danych o roślinie"}), 404
            elif isinstance(raw_data, dict):
                data = raw_data
            else:
                print(f"! Nieoczekiwany format danych: {type(raw_data)}")
                return jsonify({"error": "Nieprawidłowy format danych"}), 500

        except ValueError:
            print("! Nieprawidłowy JSON z Perenual API")
            return jsonify({"error": "Nieprawidłowy format danych"}), 500

        if not data:
            print("! Odpowiedź Perenual zawiera pusty obiekt.")
            return jsonify({"error": "Brak danych o roślinie"}), 404

        #Nazwa + ID
        # print(f"Szczegóły rośliny ID {data.get('id')}, Nazwa: {data.get('common_name')}")

        #Podlewanie
        watering_frequency = data.get("watering", "brak")
        benchmark = data.get("watering_general_benchmark")
        watering_time = safe_get(benchmark, "value", "brak")
        watering_time_clean = watering_time.strip('"')

        #min i max, jeśli jest zakres
        if '-' in watering_time_clean:
            try:
                min_day, max_day = watering_time_clean.split('-', 1)
                watering_range = {
                    "min": int(min_day),
                    "max": int(max_day)
                }
            except ValueError:
                watering_range = None
        else:
            watering_range = None


        #Światło
        sunlight = safe_join(data.get("sunlight"))

        # #Obsługa pruning
        pruning = data.get("pruning_month")

        if isinstance(pruning, list):
            if pruning and isinstance(pruning[0], str):
                pruning_period = safe_join(pruning)  # łączy listę stringów, np. "February, March, April"
                pruning_frequency = "brak"
            elif pruning and isinstance(pruning[0], dict):
                pruning_frequency = safe_get(pruning[0], "interval", "brak")
                pruning_period = safe_join(safe_get(pruning[0], "month", []))
            else:
                pruning_frequency = "brak"
                pruning_period = "brak"

        elif isinstance(pruning, dict):
            pruning_frequency = safe_get(pruning, "interval", "brak")
            pruning_period = safe_join(safe_get(pruning, "month", []))

        else:
            pruning_frequency = "brak"
            pruning_period = "brak"

        #pobieranie growth_rate
        growth_rate = safe_get(data, "growth_rate", "brak")

        #mature_height z dimensions (lista słowników)
        dimensions = safe_get(data, "dimensions", [])
        if dimensions and isinstance(dimensions, list):
            dim = dimensions[0]
            min_height = dim.get("min_value")
            max_height = dim.get("max_value")
            height_unit = dim.get("unit", "")
            
            if min_height is not None and max_height is not None:
                mature_height = f"{min_height} - {max_height} {height_unit}".strip()
            elif max_height is not None:
                mature_height = f"{max_height} {height_unit}".strip()
            else:
                mature_height = "brak"
        else:
            mature_height = "brak"

        plant_anatomy = data.get("plant_anatomy", [])

        leaf_color = "brak"
        flower_color = "brak"

        for part in plant_anatomy:
            if part.get("part") == "leaves":
                leaf_color = safe_join(part.get("color"))
            elif part.get("part") == "flowers":
                flower_color = safe_join(part.get("color"))


        default_image = data.get("default_image")
        image_url = safe_get(default_image, "regular_url", "")

        soil = safe_join(data.get("soil"))
        cycle = safe_get(data, "cycle", "brak")



        result = {
            "name": data.get("common_name", "Unknown"),
            "image": image_url,
            "sunlight": sunlight,
            "soil": soil,
            "cycle": cycle,
            "drought_tolerance": "tak" if data.get("drought_tolerant") else "nie",
            "growth_rate": growth_rate,
            "mature_height": mature_height,
            "leaf_color": leaf_color,
            "flower_color": flower_color,
            "watering_frequency": watering_frequency,
            "watering_time": watering_time_clean,
            "watering_range": watering_range,
            "pruning_frequency": pruning_frequency,
            "pruning_period": pruning_period,
        }
        # print(result)
        # Zapisz do cache
        plant_cache[plant_id] = (datetime.now(), result)

        return jsonify(result)

    except Exception as e:
        print(f"! Błąd przy pobieraniu szczegółów rośliny: {e}")
        return jsonify({"error": "Nie udało się pobrać szczegółów rośliny"}), 500

# flask login mechanizm

@app.route('/florownik')
@login_required
def florownik():
    print(">>> w florownik:", current_user)
    return render_template('florownik.html', username=current_user.username)

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        print("Czy formularz przesłany i poprawny?", form.validate_on_submit())
        print("Błędy formularza:", form.errors)
        user = User.query.filter_by(username=form.username.data).first()
        if not user:
            flash('Nieprawidłowa nazwa użytkownika lub hasło.', 'danger')
            return render_template('login.html', form=form)
        if not user.check_password(form.password.data):
            flash('Nieprawidłowa nazwa użytkownika lub hasło.', 'danger')
            return render_template('login.html', form=form)
        
        login_user(user, remember=form.remember.data)
        print(">>> login_user wywołany")
        print(">>> current_user:", current_user)
        print(">>> is_authenticated:", current_user.is_authenticated)
        flash('Zalogowano pomyślnie!', 'success')
        return redirect(url_for('florownik'))
    
    return render_template('login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()
    if form.validate_on_submit():
        existing_user = User.query.filter(
            (User.username == form.username.data) | (User.email == form.email.data)
        ).first()
        if existing_user:
            flash('Użytkownik o podanym loginie lub email już istnieje.', 'warning')
            return redirect(url_for('register'))

        new_user = User(username=form.username.data, email=form.email.data)
        new_user.set_password(form.password.data)
        db.session.add(new_user)
        db.session.commit()
        flash('Rejestracja zakończona sukcesem. Możesz się teraz zalogować.', 'success')
        print("Rejestracja OK, przekierowuję do loginu")  # debug
        return redirect(url_for('login'))
    else:
        print("Formularz nie przeszedł walidacji")
        print(form.errors)  # pokaże błędy walidacji

    return render_template('register.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Wylogowano pomyślnie.', 'info')
    return redirect(url_for('login'))

@app.route('/debug/users')
def debug_users():
    db_path = os.path.join(os.getcwd(), 'users.db')
    
    if not os.path.exists(db_path):
        return "Baza danych `users.db` nie istnieje.", 404

    try:
        users = User.query.all()
        if not users:
            return "Brak użytkowników w bazie danych."
        user_list = [f"{user.id}: {user.username} ({user.email})" for user in users]
        return "<br>".join(user_list)
    except Exception as e:
        return f"Błąd przy odczycie bazy: {e}", 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)