<p align="center">
  <img alt="Logo of the project." src="https://github.com/user-attachments/assets/09bffe90-7778-4f9c-97ca-926c5f901d15" width="256">
</p>

<h1 align="center">Team Drop Table Participants</h1>

<p align = "center">
    <img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/DROP-TABLE-Participants/b-life?style=for-the-badge">
    <img src="https://img.shields.io/github/languages/count/DROP-TABLE-Participants/b-life?style=for-the-badge">
</p>

## 💻 About
<h2 align="center">B.Life - Powering the Blood Supply Chain</h2>

## 🗂️ Tech Stack:
<p align="left">
    <a href="https://www.figma.com/"><img src="https://img.icons8.com/color/344/figma--v1.png" alt="Figma logo" width=48px/></a>
    <a href="https://github.com/"><img src="https://img.icons8.com/nolan/344/github.png" alt="GitHub logo" width=52px /></a>
    <a href="https://nextjs.org/"><img src="https://www.svgrepo.com/show/354113/nextjs-icon.svg" alt="NextJS logo" width=52px /></a>
   <a href="https://kubernetes.io/"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Kubernetes_logo_without_workmark.svg/2109px-Kubernetes_logo_without_workmark.svg.png" alt="K8s logo" width=52px/></a>
   <a href="https://www.docker.com/"><img src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png" alt="Docker logo" width=52px/></a>
   <a href="https://www.python.org/"><img src="https://cdn.iconscout.com/icon/free/png-256/free-python-logo-icon-download-in-svg-png-gif-file-formats--technology-social-media-vol-5-pack-logos-icons-2945099.png?f=webp&w=256" alt="Python logo" width=52px/></a>
</p>

## Our Team 👨‍💻 <a name = "team"></a>
Stoyan Ivanov, Kalin Chervenkov, Mario Berberov, Boris Savov, Egor Semenov

## 📥 Installation & Set Up
<p> To install our project on your machine you just need to clone it and run it using docker or npm</p>

### Local mock demo

Run `npm install` and `npm run dev`, then open [localhost:3000](http://localhost:3000).
Choose a center or hospital from the account dropdown, or use the separate Ministry administrator login button; no password is required. The application interface is in Bulgarian.

| Account | Forecast access | Transfer recommendations | Shipments |
| --- | --- | --- | --- |
| Национален център по трансфузионна хематология | All centers and hospitals | Approve and dispatch its own outgoing recommendations | Send, receive, active shipments and history |
| Регионален Център Стара Загора | Itself and its hospitals | Approve and dispatch its own outgoing recommendations | Send, receive, active shipments and history |
| Болница Света София Бургас | Itself | Advice for its own transfers only | Send, receive, active shipments and history |
| Ministry of Health (Admin) | Network risk monitoring | Read-only | Network monitoring only |

The mock network has three facilities. The Burgas hospital belongs to the Stara Zagora regional center.
All state lives in this browser's localStorage under `b-life:app-state`; there is no server database.
Version 2 automatically replaces the previous demo data on first load. Reset controls are not exposed in the interface.
The account switcher is a demo role selector, not production authentication. Tabs in the same browser share network data while keeping their own selected accounts; separate browsers do not share state.

Plan a shipment to reserve units, then dispatch it from **Моите активни пратки**, or choose **Изпращане сега**.
Only the sender can dispatch; only the recipient can mark an in-transit shipment received.
Inventory is deducted on dispatch and credited once on receipt. Simulated arrival waits for receipt confirmation.
Each facility has separate **Наличности**, **Прогнози**, **Заявки**, **Пратки**, **Препоръки**, and **Карта** pages in the sidebar.
The Ministry also has an **Общ преглед** page; all of its pages remain read-only.
Account switching preserves the current section. Shared layouts keep the selected account, sidebar, storage synchronization, and shipment simulation active across navigation.

The Mapbox map is restricted to Bulgaria, with foreign territory and labels masked outside its border.
All three facilities have selectable markers that show inventory for all eight blood types.
Only current shipments appear on the map, with selectable origin/destination routes and moving vehicle markers.
Facility accounts see their own routes; the Ministry sees the entire network, using the same map without a heatmap.
The country boundary is [Natural Earth 1:50m admin-0 data](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson), public domain, stored locally in `lib/geo/bulgaria.json`.

To request blood, choose **Заявка за кръв**, a blood type, and a positive whole quantity.
Only other facilities with enough unreserved stock appear as suppliers.
The supplier sees the request under **Моите заявки за кръв** and may accept or decline; the requester may cancel a pending request.
Acceptance rechecks stock and creates one approved shipment, reserving the quantity until dispatch.
The normal dispatch and receipt flow completes the order. The Ministry can monitor orders without taking action.
Existing saved accounts gain an empty order list without losing inventory or shipments.

Validation: `npm test`, `npm run lint`, and `npm run build`.

<hr>

<h3><B>Cloning the repository:</B></h3>

Pasting this line of code in **your favourite Terminal**:
<pre>git clone https://github.com/DROP-TABLE-Participants/b-life.git</pre>
<p>You have successfully cloned the repository! 🥳</p>

<hr>

<h3><B>Website domain:</B></h3>

<pre>https://blife.dressr.fashion</pre>

<hr>

<p>You have successfully accessed our app! 👏👏👏</p>

<hr>
