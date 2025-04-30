# Developer Guide

The following document describes the setup steps required to set up for development. This is pretty straightforward without a database!

## 1. Clone the repository

`
git clone <repository url>
cd whale_scale
`

## 2. Set up a virtual environment

### Create the virtual environment
`
python -m venv venv
`

### Activate the virtual environment:

macOS/Linux
`
source venv/bin/activate
`

Windows
`
.\env\Scripts\activate
`

### Install dependencies

`
pip install -r requirements.txt
`

** Note: When installing future dependencies, make sure to update the requirements.txt file, in the whale_scale directory. You can check what packages are installed, at what version with `pip list`.

## Start the Django server

`python manage.py runserver`

You should be able to see the following urls:

Home: http://127.0.0.1:8000/home/ (or http://localhost:8000/home/)

## Install frontend dependencies

Make sure you have npm installed.

In a new terminal/command prompt, navigate to the frontend folder and run:

```
npm install
npm start
```

This will run the frontend server.