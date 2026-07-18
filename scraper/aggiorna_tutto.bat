@echo off
cd /d "%~dp0"

echo ===================================
echo Aggiornamento PallaVolleyAmo
echo ===================================

python fetch_nazionale.py
python fetch_nazionali.py
python fetch_regionali.py
python fetch_terni.py
python fetch_perugia.py
python fetch_risultati.py
python fetch_google_news.py
python fetch_volley_feeds.py
echo ===================================
echo Pubblico il sito online (Netlify)
echo ===================================

cd ..\react-app
call npm run build
call netlify deploy --prod --dir=dist

echo ===================================
echo Aggiornamento completato.
echo ===================================
