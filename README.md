# Introduction
This example demonstrates how to visualize your Particle Photon, P1, and Electron locator results using Node.js in a Google App Engine Flexible Environment and the Google Maps Javascript API. This sample also uses the Express web framework, Websockets, and the Particle Javascript API. 

## Run Locally

### Setup

You will need to supply a Google Maps Javascript API key in order for the example to work properly. Set the key in `app.js` using the `map_api_key` variable. 

### Launch

1. Install the [Google Cloud SDK](https://cloud.google.com/sdk/), including the [gcloud tool](https://cloud.google.com/sdk/gcloud/), and [gcloud app component](https://cloud.google.com/sdk/gcloud-app).
1. Setup the gcloud tool. This provides authentication to Google Cloud APIs and services.

        gcloud init

1. Acquire local credentials for autheticating with Google Cloud Platform APIs:

        gcloud beta auth application-default login

1. Clone this repo:

        git clone https://github.com/rickkas7/locator.git
1. Open a sample folder:

        cd locator/appengine

1. Install depedencies using `npm`:

        npm install

1. Run the sample with `npm`:

        npm start

1. Visit the application at [http://localhost:8080](http://localhost:8080).

## Run in the Cloud
__Note:__ Secure WebSockets are currently not supported by App Engine Flexible Environment. WebSockets will only work if you load your page over HTTP (not HTTPS).

To use Secure WebSockets now, you can launch a VM on Google Compute Engine using a custom image where you have added SSL support for WebSockets.

### Setup

Before you can run or deploy the sample, you will need to create a new firewall rule to allow traffic on port 50051. This port will be used for websocket connections. You can do this with the [Google Cloud SDK](https://cloud.google.com/sdk) with the following command:

    gcloud compute firewall-rules create default-allow-websockets \
      --allow tcp:50051 \
      --target-tags websocket \
      --description "Allow websocket traffic on port 50051"
      
### Deploy

1. Use the [Google Developers Console](https://console.developer.google.com) to create a project/app id. (App id and project id are identical.)

1. Setup the gcloud tool, if you haven't already.

        gcloud init

1. Use gcloud to deploy your app.

        gcloud app deploy

1. Awesome! Your application is now live at `http://YOUR_PROJECT_ID.appspot.com`.  <-- Do not use HTTPS, as noted above, websockets will not work.

