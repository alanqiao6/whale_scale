WhaleScale - Web-Based Whale Measurement Tool
=============================================

🐋 PROJECT OVERVIEW
-------------------
WhaleScale is a web-based tool designed to assist marine biologists, researchers, students, teachers, and whale enthusiasts in measuring and analyzing whale dimensions from aerial photographs.

The platform provides a suite of measurement tools — including length, width, area, and curve-length calculations — enabling users to:
- Accurately measure whale dimensions from drone and aerial imagery
- Use the **curved line tool** to trace whale spines and compute flexible body lengths
- Calculate body condition indices to assess whale health
- Track changes in whale size and population over time
- Export measurement data for further analysis

WhaleScale is built around and extends functionality from several open-source photogrammetric toolkits:
- **MorphoMetriX** – for length and body dimension estimation
- **Collatrix** – for annotation and image metadata extraction
- **Xcertainty** – for managing uncertainty quantification in measurements

By integrating these tools, WhaleScale provides precise measurement capabilities and data analysis functions that help researchers better understand whale health, growth patterns, and the environmental impacts on marine mammal populations.


⚙️ DEPENDENCIES
---------------
> Python (Backend)
- Python 3.10+
- Django 5.1.5
- numpy 2.2.3
- pandas 2.2.3
- scipy 1.15.2
- pymc 5.21.0
- psycopg2-binary ≥ 2.9.0
- gunicorn
- python-decouple
- pyexiftool 0.5.5
- django-cors-headers 4.3.1

> Node.js (Frontend)
- React 19.0.0
- react-scripts 5.0.1
- exifr 7.0.0
- web-vitals 4.2.4
- cra-template 1.2.0


💻 LOCAL DEVELOPMENT SETUP
--------------------------
1. Clone the repository:
   $ git clone <repository_url>
   $ cd whale_scale

2. Set up a Python virtual environment:
   $ python -m venv venv
   $ source venv/bin/activate
   $ pip install -r requirements.txt

3. Start the Django backend server:
   $ python manage.py runserver
   Access: http://127.0.0.1:8000/home/

4. In a new terminal, install and start the frontend:
   $ cd whale_scale/frontend
   $ npm install
   $ npm start
   Access: http://localhost:3000

> For more detailed dev setup, refer to: DEV.md


🐳 DEPLOYMENT OVERVIEW (Docker + CI/CD)
---------------------------------------
WhaleScale supports full deployment via Docker and GitLab CI/CD pipelines. Both development and production environments are configured using:

- `docker-compose.yml` and `docker-compose.prod.yml`
- Nginx reverse proxy configuration
- PostgreSQL database container
- Certbot SSL support
- GitLab secrets + CI/CD integration

To run Docker in production mode locally:
   $ docker-compose -f docker-compose.prod.yml up -d --build

For full deployment steps (VCM setup, certbot, pipeline), see: DEPLOYMENT_GUIDE.md


📁 PROJECT STRUCTURE HIGHLIGHTS
-------------------------------
whale_scale/
├── frontend/         # React frontend source code
├── whale_scale/      # Django project backend
│   ├── accounts/     # User authentication (login, registration)
│   └── MMI_codex/    # Core measurement engine (Collatrix, MorphoMetriX, Xcertainty)
├── requirements.txt  # Python dependencies
├── docker-compose.yml       # Local Docker config
├── docker-compose.prod.yml  # Production Docker config
├── .gitlab-ci.yml           # GitLab CI/CD pipeline
├── nginx/                   # Nginx server config files
├── DEV.md                   # Developer setup guide
└── DEPLOYMENT_GUIDE.md      # Full production deployment instructions


📤 CONTACT & CONTRIBUTIONS
--------------------------
For issues, questions, or contributions, please contact the development team through your course repository or organizational contact point.

