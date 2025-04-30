# This is how the project was set up

### First step, creating a virtual environment and installing dependencies

After cloning the repo:

With python installed, create a virtual environment `python -m venv venv`

Depending on your python version and OS, activate the environment. I use `venv\Scripts\activate` for my windows and python 3.10 setup (for Powershell: `venv\Scripts\Activate.ps1`, for Linux/MacOS: `source venv/bin/activate`).

For this project I think we will only need Django, so I ran `pip install django django-cors-headers`. If our backend gets more complicated and we decide to use a database, we will also need `djangorestframework` for handling API calls, `mysqlclient` for using a mySQL database, and `python-decouple` for linking environment variables to settings. `django-cors-headers` will be discussed later.

Note: `djangorestframework` is a very powerful library, and I highly reccommend taking the time to do a little research on it. Basically, with `djangorestframework`, you can set up your project so that in just a few lines of code, you can hook up a custom REST API for your backend, with CRUD for all of your models built in, and you can also easily add customizable permissions, so only certain types of users (guest, user, admin, etc) can perform certain tasks. You can also automatically generate forms, user log-in, sign-up, change password, etc.

I then put all of these dependencies in the `requirements.txt` file This guarantees that when other developers want to set up the project, they can make sure that they have exactly the same dependencies and the same versions.
```
pip freeze | grep -E 'django|cors-headers' > requirements.txt
```

### Creating the Django backend

Next, we are going to create the default code for the backend. After making sure I was in the right directory, I ran: `django-admin startproject whale_scale`. This creates the backend, configured with default settings. Already, url routes, an admin panel, a default database, and templates for making pages is set up for us.

Now, the way Django works, is that there is a base project that handles the settings, database, and other project wide tasks. Then, for each major feature of your project, you create an app. These apps can have their own url routes, webpages, and subtables in the database. For example, in my study abroad website, we have an app for the student experience, and an app for the teacher experience. For now, we will just need one app: `python manage.py startapp main`. This creates an app called "main".

Now, we need to notify the project that there is a new app called `main`. We can do this by adding "main" to "INSTALLED_APPS" in the settings.py file:

```
INSTALLED_APPS = [
    # Django built-in apps
    'django.contrib.admin',          # Admin interface
    'django.contrib.auth',           # Authentication system
    'django.contrib.contenttypes',   # Content type system
    'django.contrib.sessions',       # Session framework
    'django.contrib.messages',       # Messaging framework
    'django.contrib.staticfiles',    # Static file management
    
    # Local apps
    'main',                         # Main application
]
```

Now I want to set up the URL endpoints. Currently, there is a file called `urls.py` in the `whale_scale` folder that tells the project where to go when certain urls are reached. For now, when the user goes to the base url, we want to point to our `main` app, so we will add this item to the urlpatterns list in the `whale_scale/urls.py` file: 
`
path('', include('main.urls')),
`
And also add the following import:
`
from django.urls import path, include
`
What this is saying is, when the base url is requested, use the url mapping from the `main` app. So now we need to create a file `main/urls.py`, so we can point the urls to the page we want to view. This file will look like:
```
from django.urls import path
from .views import index

urlpatterns = [
    path('home/', index),
]
```

This is saying that at the url `localhost:8000/home`, the http response from the function called `index` will be shown.

So now we need to create a function called `index` in our `main/views.py` file, that returns content to be displayed on the webpage. For now, let's make that:

```
from django.http import JsonResponse

def index(request):
    return JsonResponse({"message": "Hello World!"})
```

This `main/views.py` file will be where we handle all of the user requests from the web page (form submissions, requests for measurements, reading the metadata from images, etc). This will also serve the user the webpages created in the frontend.

Now in your terminal or command prompt, you can run `python manage.py runserver`. If you did everything right, if you put `localhost:8000/home` in your browser, you should see "hello world".

Since we will eventually want the REACT frontend to get data from the backend, we will need one more package (you will need to kill the server): `pip install django-cors-headers` and in the settings.py file, add 
`
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
`. This prevents the backend from rejecting requests from the frontend.

### Setting up REACT with the project

Make sure you have node installed, then run `npx create-react-app@latest frontend --legacy-peer-deps` from the base directory. This will create a folder called `frontend` with all of the dependencies and setup done for react. Note that when you run this, you will most definitely get some errors, but this is normal.

You might also get an error for a missing package or two, such as `web-vitals`. No worries, just run `npm install web-vitals` or any other missing packages.

In the `frontend` folder that was generated, you are goint to want to add a proxy for development in `frontend/package.json` with: `"proxy": "http://127.0.0.1:8000"`

We will also want to install `axios` to connect the frontend and the backend: `npm install axios`.

Now we can get started on the frontend!

In `frontend/src/App.js`, 

```
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
    const [message, setMessage] = useState("");

    useEffect(() => {
    axios.get('/home/')
        .then(response => {
            setMessage(response.data.message || "No message received");
        })
        .catch(error => console.error(error));
    }, []);

    return <h1>{message}</h1>;
}

export default App;
```

Now, a react frontend is set up to display the response from the backend. Run the frontend server with `npm start`. While both `npm start` and `python manage.py runserver` are running at the same time (in different terminals or command prompts), you should be able to see your app.

