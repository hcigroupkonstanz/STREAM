
<h1 align="center">
  STREAM
</h1>

<p align="center">
	<strong>
    		<a href="TODO">Publication</a>
		•
		<a href="TODO">PDF</a>
		•
		<a href="TODO">Video</a>
	</strong>
</p>

![STREAM combines spatially-aware tablets with augmented reality head-mounted displays for visual data analysis. Users can
interact with 3D visualizations through a multimodal interaction concept, allowing for fluid interaction with the visualizations.](./stream.jpg?raw=true)

This is the code repository of the CHI'21 publication:

> Sebastian Hubenschmid, Johannes Zagermann, Simon Butscher, and Harald Reiterer. 2021. STREAM: Exploring the Combination of Spatially-Aware Tablets with Augmented Reality Head-Mounted Displays for Immersive Analytics. In *CHI Conference on Human Factors in Computing Systems (CHI’21)*, May 8–13, 2021, Yokohama, Japan. ACM, New York, NY, USA, 14 pages. doi: [10.1145/3411764.3445298](https://doi.org/10.1145/3411764.3445298)

For questions or feedback, please contact [Sebastian Hubenschmid](https://hci.uni-konstanz.de/personen/wissenschaftliche-mitarbeiterinnen/sebastian-hubenschmid/) ([GitHub](https://github.com/SebiH)).

## Overview

This repository is split into separate projects:

* **util** contains 3D object files for mounting HTC Valve Trackers onto an iPad and Vuforia images for unifying coordinate systems.
* **stream-ar** contains the Augmented Reality app that runs on a Microsoft HoloLens (see the `spectator` branch for an ARCore/ARKit version). For development, it can also run in the Unity Editor without any special hardware. See the [Releases page](/hcigroupkonstanz/STREAM/releases) for precompiled artefacts.
* **stream-tracking** is a helper application to forward HTC Vive Tracker data to the server, making tablets spatially aware.
* **stream-server** provides real-time communication, data processing, and a web interface for debugging and controlling the application.
* **stream-tablet** contains the user interface of the spatially-aware tablets as Angular web application

## Augmented Reality Application

*Requirements:* Unity 2019.4 or higher

*Development:* Open with Unity, use scene `Scenes/Main.unity`.

*Deployment*: Follow MRTK2 build tutorial, or download from [Releases page](/hcigroupkonstanz/STREAM/releases).

*Notes:*

* Please add your own [Vuforia Developer Key](https://developer.vuforia.com/license-manager) if tracking spatial-awareness is required
* For our *spectator mode*, please use the *spectator* branch


## Tracking

*Requirements:* Unity 2019.4 or higher

*Development:* Open with Unity, use scene `Scenes/Development.unity`, adjust server IP in `[NetworkStatus]` GameObject during runtime to point to the STREAM server

*Deployment*: *Not available. Run in Unity Editor.*

*Notes:*

* Although this application is necessary for the tablet's spatial awareness, STREAM degrades gracefully and is usable without spatial tracking. However, features that require spatial tracking (*tablet lens* and rotation during placement) are only available with spatial tracking.


## Server

*Requirements:* NodeJS v12+ (due to use of worker threads)

*Deployment*: `npm install && npm run build`, then run with `npm start`. Load dataset on the admin webinterface (`<server_ip>:8090/`) via the *Load Study* or *Load Tutorial* dataset buttons, or type `study.load("myDataSet")` for custom datasets.

*Development:* Run `npm run watch`  in `stream-server/` directory

*Notes:*

* An admin webinterface is available at `<server_ip>:8090/`
* Data **must** be loaded manually via webinterface.
* Additional datasets can be added in the `data` folder, and can be dynamically loaded via the `study.load("<name>")` command on the admin webinterface.


## Tablet

*Requirements:* NodeJS

*Deployment*: `npm install && npm run build` **after** building the server. Must be rerun when rebuilding the server.

*Development:* Run `npm start` in `stream-tablet` directory, open `localhost:4200`.

*Notes:*

* Configure the tablet with the appropriate *Owner Id* (= HoloLens) in the tablet settings. The ID can be found in the webinterface.
* For spatial-awareness, additional setup steps are required (once for every device / when trackers are changed):
  * Add appropriate trackers in the tablet settings. Trackers should appear automatically in the list once the **Tracking** server is running, and the Vive Trackers are active.
  * When changing or adding Vive Trackers, a calibration process must be run once. For this, click the *calibrate* button in the tablet settings and look at the display with a *calibrated* HoloLens.

## Acknowledgments

Thanks to NASA for offering an open data set, which was used for conducting the study in this project: https://exoplanetarchive.ipac.caltech.edu/

This research was funded by the Deutsche Forschungsgemeinschaft (DFG, German Research Foundation) – Project-ID 251654672 – TRR 161 (Project C01) and SMARTACT (BMBF, Grant 01EL1820A).
