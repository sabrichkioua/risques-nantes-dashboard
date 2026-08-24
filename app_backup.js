"use strict";


/* ==========================================================================
   ETAT GLOBAL
   ========================================================================== */

let currentStatus = null;


/* ==========================================================================
   OUTILS
   ========================================================================== */

function formatDate(value) {

    if (!value) {
        return "Donnée indisponible";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(
        "fr-FR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}


function formatHour(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleTimeString(
        "fr-FR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function formatNumber(
    value,
    decimals = 1
) {

    if (
        value === null
        || value === undefined
        || Number.isNaN(Number(value))
    ) {
        return "—";
    }

    return Number(value).toLocaleString(
        "fr-FR",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
        }
    );
}


function formatDirection(value) {

    if (
        value === null
        || value === undefined
        || Number.isNaN(Number(value))
    ) {
        return "—";
    }

    return `${Math.round(value)}°`;
}


function formatLevel(value) {

    if (!value) {
        return "—";
    }

    const levels = {
        "FAIBLE": "Faible",
        "MODERE": "Modéré",
        "ELEVE": "Élevé",
        "TRES_ELEVE": "Très élevé"
    };

    return levels[value] ?? value;
}


function levelClass(value) {

    const classes = {
        "FAIBLE": "timeline-level-faible",
        "MODERE": "timeline-level-modere",
        "ELEVE": "timeline-level-eleve",
        "TRES_ELEVE": "timeline-level-tres-eleve"
    };

    return (
        classes[value]
        ?? "timeline-level-inconnu"
    );
}


/* ==========================================================================
   STATUT GENERAL
   ========================================================================== */

async function loadStatus() {

    const errorBox =
        document.getElementById("error");

    try {

        const response = await fetch(
            "data/status.json",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        currentStatus = data;

        document.getElementById(
            "meteo-date"
        ).textContent = formatDate(
            data.meteo?.date
        );

        document.getElementById(
            "hydro-date"
        ).textContent = formatDate(
            data.hydro?.date
        );

        document.getElementById(
            "radar-date"
        ).textContent = formatDate(
            data.radar?.date
        );

        document.getElementById(
            "arome-run"
        ).textContent = formatDate(
            data.arome?.run
        );

        document.getElementById(
            "incendie-niveau"
        ).textContent =
            data.incendie?.niveau
            ?? "Donnée indisponible";

        const echeance =
            data.incendie?.echeance_pic;

        const datePic =
            data.incendie?.date_pic;

        document.getElementById(
            "incendie-pic"
        ).textContent =
            (
                echeance !== null
                && echeance !== undefined
            )
                ? `H+${echeance} — ${formatDate(datePic)}`
                : "Donnée indisponible";

        document.getElementById(
            "generated-at"
        ).textContent = formatDate(
            data.generated_at
        );

        errorBox.style.display =
            "none";

        return data;

    } catch (error) {

        errorBox.textContent =
            `Impossible de charger le statut : ${error}`;

        errorBox.style.display =
            "block";

        console.error(
            "Erreur chargement statut :",
            error
        );

        return null;
    }
}




/* ==========================================================================
   SITUATION A SURVEILLER
   ========================================================================== */

function renderSituationIncendie(
    data
) {

    const container =
        document.getElementById(
            "situation-incendie-content"
        );

    if (!container) {
        return;
    }

    const items =
        data.timeline ?? [];

    if (!items.length) {

        container.textContent =
            "Donnée indisponible";

        return;
    }

    const peakEcheance =
        currentStatus
            ?.incendie
            ?.echeance_pic;

    const peakItem =
        items.find(
            item =>
                Number(
                    item.echeance_h
                )
                === Number(
                    peakEcheance
                )
        );

    const significantItems =
        items.filter(
            item =>
                [
                    "MODERE",
                    "ELEVE",
                    "TRES_ELEVE"
                ].includes(
                    item.libelle_max
                )
        );

    const firstSignificant =
        significantItems[0];

    const lastSignificant =
        significantItems[
            significantItems.length - 1
        ];

    const niveau =
        currentStatus
            ?.incendie
            ?.niveau
        ?? peakItem
            ?.libelle_max
        ?? "—";

    const picText =
        peakItem
            ? `
                H+${peakItem.echeance_h}
                —
                ${formatDate(
                    peakItem.date_validite
                )}
            `
            : "—";

    const surfaceText =
        peakItem
            ? `
                ${formatNumber(
                    peakItem.surface_concernee_ha,
                    0
                )} ha
            `
            : "—";

    let windowText =
        "Aucune échéance significative.";

    if (
        firstSignificant
        && lastSignificant
    ) {

        windowText = `
            ${formatDate(
                firstSignificant.date_validite
            )}
            →
            ${formatDate(
                lastSignificant.date_validite
            )}
        `;
    }

    container.innerHTML = `

        <div class="situation-main-value">
            ${formatLevel(niveau)}
        </div>

        <p>
            <strong>Pic :</strong>
            ${picText}
        </p>

        <p>
            <strong>Surface concernée au pic :</strong>
            ${surfaceText}
        </p>

        <p>
            <strong>Fenêtre modérée ou supérieure :</strong>
            ${windowText}
        </p>

        <p class="situation-note">
            Indicateur exploratoire de propension.
        </p>
    `;
}


function renderSituationHydro(
    data
) {

    const container =
        document.getElementById(
            "situation-hydro-content"
        );

    if (!container) {
        return;
    }

    const features =
        data.features ?? [];

    if (!features.length) {

        container.textContent =
            "Donnée indisponible";

        return;
    }

    const properties =
        features.map(
            feature =>
                feature.properties ?? {}
        );

    const maree =
        properties.filter(
            item =>
                item.libelle_dynamique
                === "ANALYSE_MAREE_REQUISE"
        );

    const interpretable =
        properties.filter(
            item =>
                item.libelle_dynamique
                !== "ANALYSE_MAREE_REQUISE"
        );

    const stable =
        interpretable.filter(
            item =>
                (
                    item.tendance_courte
                    ?? item.tendance
                    ?? ""
                )
                .toUpperCase()
                === "STABLE"
        );

    const hausse =
        interpretable.filter(
            item =>
                (
                    item.tendance_courte
                    ?? item.tendance
                    ?? ""
                )
                .toUpperCase()
                === "HAUSSE"
        );

    const baisse =
        interpretable.filter(
            item =>
                (
                    item.tendance_courte
                    ?? item.tendance
                    ?? ""
                )
                .toUpperCase()
                === "BAISSE"
        );

    let interpretationText;

    if (hausse.length > 0) {

        interpretationText =
            `${hausse.length} station(s) en hausse`;

    } else {

        interpretationText =
            "Aucune hausse sur les stations interprétables";
    }

    container.innerHTML = `

        <div class="situation-main-value">
            ${features.length} stations suivies
        </div>

        <p>
            <strong>Stables :</strong>
            ${stable.length}
        </p>

        <p>
            <strong>En baisse :</strong>
            ${baisse.length}
        </p>

        <p>
            <strong>Influence de la marée :</strong>
            ${maree.length}
        </p>

        <p>
            ${interpretationText}
        </p>
    `;
}


function renderSituationMeteo(
    data
) {

    const container =
        document.getElementById(
            "situation-meteo-content"
        );

    if (!container) {
        return;
    }

    const features =
        data.features ?? [];

    if (!features.length) {

        container.textContent =
            "Donnée indisponible";

        return;
    }

    const properties =
        features.map(
            feature =>
                feature.properties ?? {}
        );

    function numericValues(
        property
    ) {

        return properties
            .map(
                item =>
                    Number(
                        item[property]
                    )
            )
            .filter(
                value =>
                    Number.isFinite(
                        value
                    )
            );
    }

    const temperatures =
        numericValues(
            "temperature_c"
        );

    const vents =
        numericValues(
            "vent_kmh"
        );

    const rafales =
        numericValues(
            "rafale_10min_kmh"
        );

    const pluies =
        numericValues(
            "pluie_mm"
        );

    const temperatureMax =
        temperatures.length
            ? Math.max(
                ...temperatures
            )
            : null;

    const ventMax =
        vents.length
            ? Math.max(
                ...vents
            )
            : null;

    const rafaleMax =
        rafales.length
            ? Math.max(
                ...rafales
            )
            : null;

    const pluieMax =
        pluies.length
            ? Math.max(
                ...pluies
            )
            : null;

    let pluieText =
        "Donnée de pluie indisponible";

    if (
        pluieMax !== null
        && pluieMax === 0
    ) {

        pluieText =
            `Aucune pluie relevée sur ${pluies.length} station(s)`;

    } else if (
        pluieMax !== null
    ) {

        pluieText =
            `Pluie maximale relevée : ${formatNumber(
                pluieMax,
                1
            )} mm`;
    }

    container.innerHTML = `

        <div class="situation-main-value">
            ${features.length} stations suivies
        </div>

        <p>
            <strong>Température max :</strong>
            ${formatNumber(
                temperatureMax,
                1
            )} °C
        </p>

        <p>
            <strong>Vent max :</strong>
            ${formatNumber(
                ventMax,
                1
            )} km/h
        </p>

        <p>
            <strong>Rafale max :</strong>
            ${formatNumber(
                rafaleMax,
                1
            )} km/h
        </p>

        <p>
            ${pluieText}
        </p>
    `;
}


/* ==========================================================================
   TIMELINE INCENDIE
   ========================================================================== */

function timelineDetailHtml(
    item,
    isPeak
) {

    const peakText =
        isPeak
            ? `
                <div class="timeline-detail-peak">
                    Échéance retenue comme pic
                </div>
            `
            : "";

    return `
        <div class="timeline-detail-content">

            ${peakText}

            <div class="timeline-detail-main">

                <div>
                    <strong>
                        ${formatLevel(item.libelle_max)}
                    </strong>
                </div>

                <div>
                    H+${item.echeance_h}
                    —
                    ${formatDate(item.date_validite)}
                </div>

            </div>

            <div class="timeline-detail-grid">

                <div>
                    <span>
                        Surface concernée
                    </span>

                    <strong>
                        ${formatNumber(
                            item.surface_concernee_ha,
                            1
                        )} ha
                    </strong>
                </div>

                <div>
                    <span>
                        Modéré
                    </span>

                    <strong>
                        ${formatNumber(
                            item.surface_modere_ha,
                            1
                        )} ha
                    </strong>
                </div>

                <div>
                    <span>
                        Élevé
                    </span>

                    <strong>
                        ${formatNumber(
                            item.surface_eleve_ha,
                            1
                        )} ha
                    </strong>
                </div>

                <div>
                    <span>
                        Très élevé
                    </span>

                    <strong>
                        ${formatNumber(
                            item.surface_tres_eleve_ha,
                            1
                        )} ha
                    </strong>
                </div>

            </div>

        </div>
    `;
}


function selectTimelineItem(
    button,
    item,
    isPeak
) {

    document
        .querySelectorAll(
            ".timeline-item"
        )
        .forEach(
            element => {
                element.classList.remove(
                    "is-selected"
                );
            }
        );

    button.classList.add(
        "is-selected"
    );

    const detail =
        document.getElementById(
            "incendie-timeline-detail"
        );

    detail.innerHTML =
        timelineDetailHtml(
            item,
            isPeak
        );
}


function renderTimeline(data) {

    const timeline =
        document.getElementById(
            "incendie-timeline"
        );

    const runBox =
        document.getElementById(
            "incendie-timeline-run"
        );

    const summary =
        document.getElementById(
            "incendie-timeline-summary"
        );

    const detail =
        document.getElementById(
            "incendie-timeline-detail"
        );

    timeline.innerHTML = "";

    const items =
        data.timeline ?? [];

    if (!items.length) {

        summary.textContent =
            "Aucune échéance disponible.";

        detail.innerHTML = "";

        return;
    }

    runBox.textContent =
        `Run AROME : ${formatDate(data.date_run)}`;

    const peakEcheance =
        currentStatus
            ?.incendie
            ?.echeance_pic;

    const peakDate =
        currentStatus
            ?.incendie
            ?.date_pic;

    if (
        peakEcheance !== null
        && peakEcheance !== undefined
    ) {

        summary.innerHTML = `
            ${items.length} échéances —
            pic retenu :
            <strong>
                H+${peakEcheance}
            </strong>
            (${formatDate(peakDate)})
        `;

    } else {

        summary.textContent =
            `${items.length} échéances disponibles`;
    }


    let peakButton = null;
    let peakItem = null;


    items.forEach(
        item => {

            const isPeak =
                Number(item.echeance_h)
                === Number(peakEcheance);

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                [
                    "timeline-item",
                    levelClass(
                        item.libelle_max
                    ),
                    isPeak
                        ? "is-peak"
                        : ""
                ]
                .filter(Boolean)
                .join(" ");


            const peakMarker =
                isPeak
                    ? `
                        <span class="timeline-peak-label">
                            PIC
                        </span>
                    `
                    : "";


            button.innerHTML = `

                ${peakMarker}

                <span class="timeline-hour">
                    ${formatHour(
                        item.date_validite
                    )}
                </span>

                <span class="timeline-dot"></span>

                <span class="timeline-echeance">
                    H+${item.echeance_h}
                </span>

                <span class="timeline-level">
                    ${formatLevel(
                        item.libelle_max
                    )}
                </span>

            `;


            button.addEventListener(
                "click",
                () => {

                    selectTimelineItem(
                        button,
                        item,
                        isPeak
                    );
                }
            );


            timeline.appendChild(
                button
            );


            if (isPeak) {

                peakButton =
                    button;

                peakItem =
                    item;
            }
        }
    );


    /*
     * Au chargement :
     * sélection automatique du pic.
     *
     * S'il n'existe pas, on sélectionne
     * la première échéance.
     */

    if (
        peakButton
        && peakItem
    ) {

        selectTimelineItem(
            peakButton,
            peakItem,
            true
        );

        /*
         * Permet de faire apparaître directement
         * le pic dans la zone scrollable.
         */

        setTimeout(
            () => {

                peakButton.scrollIntoView(
                    {
                        behavior: "smooth",
                        block: "nearest",
                        inline: "center"
                    }
                );
            },
            100
        );

    } else {

        const firstButton =
            timeline.querySelector(
                ".timeline-item"
            );

        if (
            firstButton
            && items[0]
        ) {

            selectTimelineItem(
                firstButton,
                items[0],
                false
            );
        }
    }
}


async function loadIncendieTimeline() {

    try {

        const response = await fetch(
            "data/incendie_timeline.json",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        renderTimeline(
            data
        );

        renderSituationIncendie(
            data
        );

    } catch (error) {

        console.error(
            "Erreur chargement timeline incendie :",
            error
        );

        document.getElementById(
            "incendie-timeline-summary"
        ).textContent =
            "Impossible de charger la timeline incendie.";
    }
}


/* ==========================================================================
   CARTE
   ========================================================================== */

const map = L.map(
    "map",
    {
        zoomControl: true
    }
).setView(
    [
        47.22,
        -1.55
    ],
    10
);


const baseLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
);

baseLayer.addTo(map);


/* ==========================================================================
   PANES LEAFLET
   ========================================================================== */

map.createPane(
    "incendiePane"
);

map.getPane(
    "incendiePane"
).style.zIndex = 410;


map.createPane(
    "stationsPane"
);

map.getPane(
    "stationsPane"
).style.zIndex = 450;


map.createPane(
    "ventPane"
);

map.getPane(
    "ventPane"
).style.zIndex = 460;


/* ==========================================================================
   GROUPES DE COUCHES
   ========================================================================== */

const incendieLayer =
    L.layerGroup();

const hydroLayer =
    L.layerGroup();

const meteoLayer =
    L.layerGroup();

const ventLayer =
    L.layerGroup();


incendieLayer.addTo(map);
hydroLayer.addTo(map);
meteoLayer.addTo(map);
ventLayer.addTo(map);


const overlays = {
    "Hydrologie": hydroLayer,
    "Météo": meteoLayer,
    "Propension incendie": incendieLayer,
    "Vent AROME": ventLayer
};


L.control.layers(
    null,
    overlays,
    {
        collapsed: false
    }
).addTo(map);


/* ==========================================================================
   HYDROLOGIE
   ========================================================================== */

function hydroPopup(
    properties
) {

    return `
        <div class="hydro-popup">

            <div class="hydro-popup-title">
                ${
                    properties.nom_station
                    ?? "Station hydrologique"
                }
            </div>

            <div class="hydro-popup-river">
                ${properties.cours_eau ?? ""}
            </div>

            <div class="hydro-popup-row">
                <span class="hydro-popup-label">
                    Commune :
                </span>
                ${properties.commune ?? "—"}
            </div>

            <div class="hydro-popup-row">
                <span class="hydro-popup-label">
                    Niveau :
                </span>

                ${formatNumber(
                    properties.valeur_actuelle,
                    3
                )}

                ${properties.unite ?? ""}
            </div>

            <div class="hydro-popup-row">
                <span class="hydro-popup-label">
                    Δ 1 h :
                </span>

                ${formatNumber(
                    properties.delta_1h,
                    3
                )}

                ${properties.unite ?? ""}
            </div>

            <div class="hydro-popup-row">
                <span class="hydro-popup-label">
                    Δ 3 h :
                </span>

                ${formatNumber(
                    properties.delta_3h,
                    3
                )}

                ${properties.unite ?? ""}
            </div>

            <div class="hydro-popup-row">
                <span class="hydro-popup-label">
                    Δ 6 h :
                </span>

                ${formatNumber(
                    properties.delta_6h,
                    3
                )}

                ${properties.unite ?? ""}
            </div>

            <div class="hydro-popup-row">
                <span class="hydro-popup-label">
                    Tendance :
                </span>

                ${
                    properties.tendance_courte
                    ?? properties.tendance
                    ?? "—"
                }
            </div>

            <div class="hydro-popup-row">
                <span class="hydro-popup-label">
                    Situation :
                </span>

                ${
                    properties.libelle_dynamique
                    ?? "—"
                }
            </div>

            <div class="hydro-popup-row">
                <span class="hydro-popup-label">
                    Observation :
                </span>

                ${formatDate(
                    properties.date_derniere
                )}
            </div>

            <div class="hydro-popup-motif">
                ${properties.motif ?? ""}
            </div>

        </div>
    `;
}


async function loadHydro() {

    try {

        const response = await fetch(
            "data/hydro.geojson",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        renderSituationHydro(
            data
        );

        hydroLayer.clearLayers();

        const geoJsonLayer =
            L.geoJSON(
                data,
                {

                    pointToLayer:
                        function (
                            feature,
                            latlng
                        ) {

                            return L.circleMarker(
                                latlng,
                                {
                                    pane:
                                        "stationsPane",

                                    radius:
                                        8,

                                    weight:
                                        2,

                                    fillOpacity:
                                        0.8,

                                    className:
                                        "hydro-marker"
                                }
                            );
                        },

                    onEachFeature:
                        function (
                            feature,
                            layer
                        ) {

                            layer.bindPopup(
                                hydroPopup(
                                    feature.properties
                                )
                            );
                        }
                }
            );

        hydroLayer.addLayer(
            geoJsonLayer
        );

    } catch (error) {

        console.error(
            "Erreur chargement hydro :",
            error
        );
    }
}


/* ==========================================================================
   METEO
   ========================================================================== */

function meteoPopup(
    properties
) {

    return `
        <div class="meteo-popup">

            <div class="meteo-popup-title">
                ${
                    properties.nom_station
                    ?? "Station météo"
                }
            </div>

            <div class="meteo-popup-date">
                Observation :
                ${formatDate(
                    properties.date_observation
                )}
            </div>

            <div class="meteo-popup-row">
                <span class="meteo-popup-label">
                    Température :
                </span>

                ${formatNumber(
                    properties.temperature_c,
                    1
                )} °C
            </div>

            <div class="meteo-popup-row">
                <span class="meteo-popup-label">
                    Humidité :
                </span>

                ${formatNumber(
                    properties.humidite_pct,
                    0
                )} %
            </div>

            <div class="meteo-popup-row">
                <span class="meteo-popup-label">
                    Vent :
                </span>

                ${formatNumber(
                    properties.vent_kmh,
                    1
                )} km/h
            </div>

            <div class="meteo-popup-row">
                <span class="meteo-popup-label">
                    Direction :
                </span>

                ${formatDirection(
                    properties.direction_vent_deg
                )}
            </div>

            <div class="meteo-popup-row">
                <span class="meteo-popup-label">
                    Rafale :
                </span>

                ${formatNumber(
                    properties.rafale_10min_kmh,
                    1
                )} km/h
            </div>

            <div class="meteo-popup-row">
                <span class="meteo-popup-label">
                    Pluie :
                </span>

                ${formatNumber(
                    properties.pluie_mm,
                    1
                )} mm
            </div>

            <div class="meteo-popup-row">
                <span class="meteo-popup-label">
                    Pression :
                </span>

                ${formatNumber(
                    properties.pression_mer_hpa,
                    1
                )} hPa
            </div>

        </div>
    `;
}


async function loadMeteo() {

    try {

        const response = await fetch(
            "data/meteo.geojson",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        renderSituationMeteo(
            data
        );

        meteoLayer.clearLayers();

        const geoJsonLayer =
            L.geoJSON(
                data,
                {

                    pointToLayer:
                        function (
                            feature,
                            latlng
                        ) {

                            return L.marker(
                                latlng,
                                {
                                    pane:
                                        "stationsPane",

                                    icon:
                                        L.divIcon(
                                            {
                                                className:
                                                    "meteo-marker",

                                                html:
                                                    "<div></div>",

                                                iconSize:
                                                    [
                                                        14,
                                                        14
                                                    ],

                                                iconAnchor:
                                                    [
                                                        7,
                                                        7
                                                    ]
                                            }
                                        )
                                }
                            );
                        },

                    onEachFeature:
                        function (
                            feature,
                            layer
                        ) {

                            layer.bindPopup(
                                meteoPopup(
                                    feature.properties
                                )
                            );
                        }
                }
            );

        meteoLayer.addLayer(
            geoJsonLayer
        );

    } catch (error) {

        console.error(
            "Erreur chargement météo :",
            error
        );
    }
}


/* ==========================================================================
   INCENDIE
   ========================================================================== */

function incendieStyle(
    feature
) {

    const niveau =
        feature.properties
            ?.libelle_propension
            ?.toUpperCase();

    if (
        niveau === "TRES ELEVE"
        || niveau === "TRÈS ÉLEVÉ"
    ) {

        return {
            pane: "incendiePane",
            color: "#8b1e1e",
            weight: 1.5,
            fillColor: "#c62828",
            fillOpacity: 0.40
        };
    }

    if (
        niveau === "ELEVE"
        || niveau === "ÉLEVÉ"
    ) {

        return {
            pane: "incendiePane",
            color: "#b54816",
            weight: 1.5,
            fillColor: "#ef6c00",
            fillOpacity: 0.38
        };
    }

    if (
        niveau === "MODERE"
        || niveau === "MODÉRÉ"
    ) {

        return {
            pane: "incendiePane",
            color: "#b88700",
            weight: 1.3,
            fillColor: "#f7b733",
            fillOpacity: 0.32
        };
    }

    if (
        niveau === "FAIBLE"
    ) {

        return {
            pane: "incendiePane",
            color: "#768b36",
            weight: 1.2,
            fillColor: "#c7d36f",
            fillOpacity: 0.25
        };
    }

    return {
        pane: "incendiePane",
        color: "#666666",
        weight: 1.2,
        fillColor: "#aaaaaa",
        fillOpacity: 0.25
    };
}


function incendiePopup(
    properties
) {

    const echeance =
        properties.echeance_h;

    const echeanceText =
        (
            echeance !== null
            && echeance !== undefined
        )
            ? `H+${echeance}`
            : "—";

    return `
        <div class="incendie-popup">

            <div class="incendie-popup-title">
                Propension incendie
            </div>

            <div class="incendie-popup-level">
                ${
                    properties.libelle_propension
                    ?? "—"
                }
            </div>

            <div class="incendie-popup-row">
                <span class="incendie-popup-label">
                    Échéance :
                </span>

                ${echeanceText}
            </div>

            <div class="incendie-popup-row">
                <span class="incendie-popup-label">
                    Validité :
                </span>

                ${formatDate(
                    properties.date_validite
                )}
            </div>

            <div class="incendie-popup-row">
                <span class="incendie-popup-label">
                    Run AROME :
                </span>

                ${formatDate(
                    properties.date_run
                )}
            </div>

            <div class="incendie-popup-row">
                <span class="incendie-popup-label">
                    Surface :
                </span>

                ${formatNumber(
                    properties.surface_ha,
                    0
                )} ha
            </div>

            <div class="incendie-popup-note">
                Indicateur exploratoire de propension.
            </div>

        </div>
    `;
}


async function loadIncendie() {

    try {

        const response = await fetch(
            "data/incendie.geojson",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        incendieLayer.clearLayers();

        const geoJsonLayer =
            L.geoJSON(
                data,
                {
                    pane:
                        "incendiePane",

                    style:
                        function (
                            feature
                        ) {

                            return incendieStyle(
                                feature
                            );
                        },

                    onEachFeature:
                        function (
                            feature,
                            layer
                        ) {

                            layer.bindPopup(
                                incendiePopup(
                                    feature.properties
                                )
                            );
                        }
                }
            );

        incendieLayer.addLayer(
            geoJsonLayer
        );

    } catch (error) {

        console.error(
            "Erreur chargement incendie :",
            error
        );
    }
}


/* ==========================================================================
   VENT AROME
   ========================================================================== */

function ventArrowSize(
    ventKmh
) {

    const vent =
        Number(
            ventKmh
        );

    if (
        Number.isNaN(
            vent
        )
    ) {
        return 18;
    }

    return Math.max(
        16,
        Math.min(
            28,
            14 + vent * 0.3
        )
    );
}


function createVentIcon(
    properties
) {

    const direction =
        Number(
            properties.direction_fleche_deg
        );

    const rotation =
        Number.isNaN(
            direction
        )
            ? 0
            : direction;

    const size =
        ventArrowSize(
            properties.vent_kmh
        );

    const html = `
        <div
            style="
                width: ${size}px;
                height: ${size}px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${size}px;
                font-weight: 700;
                line-height: 1;
                color: #202428;
                text-shadow:
                    0 0 2px white,
                    0 0 3px white;
                transform: rotate(${rotation}deg);
                transform-origin: center center;
                pointer-events: auto;
            "
        >
            ↑
        </div>
    `;

    return L.divIcon(
        {
            className:
                "vent-arome-marker",

            html:
                html,

            iconSize:
                [
                    size,
                    size
                ],

            iconAnchor:
                [
                    size / 2,
                    size / 2
                ]
        }
    );
}


function ventPopup(
    properties
) {

    const echeance =
        properties.echeance_h;

    const echeanceText =
        (
            echeance !== null
            && echeance !== undefined
        )
            ? `H+${echeance}`
            : "—";

    return `
        <div style="min-width: 220px;">

            <div
                style="
                    font-weight: 700;
                    font-size: 1rem;
                    margin-bottom: 8px;
                "
            >
                Vent AROME
            </div>

            <div style="margin: 4px 0;">
                <strong>Vent :</strong>

                ${formatNumber(
                    properties.vent_kmh,
                    1
                )} km/h
            </div>

            <div style="margin: 4px 0;">
                <strong>Vent :</strong>

                ${formatNumber(
                    properties.vent_ms,
                    1
                )} m/s
            </div>

            <div style="margin: 4px 0;">
                <strong>Direction météo :</strong>

                ${formatDirection(
                    properties.direction_vent_deg
                )}
            </div>

            <div style="margin: 4px 0;">
                <strong>Échéance :</strong>

                ${echeanceText}
            </div>

            <div style="margin: 4px 0;">
                <strong>Validité :</strong>

                ${formatDate(
                    properties.date_validite
                )}
            </div>

            <div style="margin: 4px 0;">
                <strong>Run AROME :</strong>

                ${formatDate(
                    properties.date_run
                )}
            </div>

        </div>
    `;
}


async function loadVent() {

    try {

        const response = await fetch(
            "data/vent_incendie.geojson",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        ventLayer.clearLayers();

        const geoJsonLayer =
            L.geoJSON(
                data,
                {

                    pointToLayer:
                        function (
                            feature,
                            latlng
                        ) {

                            return L.marker(
                                latlng,
                                {
                                    pane:
                                        "ventPane",

                                    icon:
                                        createVentIcon(
                                            feature.properties
                                        )
                                }
                            );
                        },

                    onEachFeature:
                        function (
                            feature,
                            layer
                        ) {

                            layer.bindPopup(
                                ventPopup(
                                    feature.properties
                                )
                            );
                        }
                }
            );

        ventLayer.addLayer(
            geoJsonLayer
        );

    } catch (error) {

        console.error(
            "Erreur chargement vent AROME :",
            error
        );
    }
}


/* ==========================================================================
   CADRAGE INITIAL
   ========================================================================== */

async function fitInitialBounds() {

    const layers = [
        hydroLayer,
        meteoLayer,
        incendieLayer
    ];

    const bounds =
        L.latLngBounds();

    for (
        const layerGroup
        of layers
    ) {

        layerGroup.eachLayer(
            function (
                layer
            ) {

                if (
                    typeof layer.getBounds
                    === "function"
                ) {

                    const layerBounds =
                        layer.getBounds();

                    if (
                        layerBounds
                        && layerBounds.isValid()
                    ) {

                        bounds.extend(
                            layerBounds
                        );
                    }
                }
            }
        );
    }

    if (
        bounds.isValid()
    ) {

        map.fitBounds(
            bounds,
            {
                padding:
                    [
                        30,
                        30
                    ],

                maxZoom:
                    10
            }
        );
    }
}


/* ==========================================================================
   RAFRAICHISSEMENT
   ========================================================================== */

async function refreshData() {

    /*
     * On charge d'abord le statut.
     *
     * La timeline utilise notamment
     * echeance_pic pour savoir quel point
     * doit être marqué "PIC".
     */

    await loadStatus();

    await Promise.all(
        [
            loadIncendieTimeline(),
            loadHydro(),
            loadMeteo(),
            loadIncendie(),
            loadVent()
        ]
    );
}


/* ==========================================================================
   INITIALISATION
   ========================================================================== */

async function init() {

    await refreshData();

    await fitInitialBounds();
}


init();


/*
 * Les fichiers JSON / GeoJSON sont relus
 * automatiquement toutes les 5 minutes.
 */
setInterval(
    refreshData,
    5 * 60 * 1000
);

/* ==========================================================================
   METADONNEES CHAINE DE DONNEES
   ========================================================================== */

function updateDataChain(status) {

    if (!status) return;

    const generated = status.generated_at;

    function latency(date) {
        if (!date || !generated) return "—";
        const minutes = Math.round((new Date(generated)-new Date(date))/60000);
        return minutes + " min";
    }

    const write = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    write("chain-meteo", `
        <b>Source :</b> Météo-France stations<br>
        <b>Type :</b> observation réelle<br>
        <b>Donnée :</b> ${formatDate(status.meteo.date)}<br>
        <b>Intégration :</b> ${formatDate(generated)}<br>
        <b>Délai :</b> ${latency(status.meteo.date)}
    `);

    write("chain-hydro", `
        <b>Source :</b> Vigicrues / Hub'Eau<br>
        <b>Type :</b> observation réelle<br>
        <b>Donnée :</b> ${formatDate(status.hydro.date)}<br>
        <b>Délai :</b> ${latency(status.hydro.date)}
    `);

    write("chain-radar", `
        <b>Source :</b> Météo-France lame d'eau radar 500 m<br>
        <b>Type :</b> estimation radar<br>
        <b>Donnée :</b> ${formatDate(status.radar.date)}<br>
        <b>Délai :</b> ${latency(status.radar.date)}
    `);

    write("chain-arome", `
        <b>Source :</b> Météo-France AROME<br>
        <b>Type :</b> prévision numérique<br>
        <b>Run :</b> ${formatDate(status.arome.run)}<br>
        <b>Échéance :</b> H+${status.incendie?.echeance_pic ?? "—"}
    `);

    write("chain-incendie", `
        <b>Type :</b> indicateur calculé<br>
        <b>Niveau :</b> ${status.incendie.niveau}<br>
        <b>Méthode :</b> météo + AROME + facteurs territoriaux<br>
        <b>Attention :</b> non officiel
    `);
}

const oldDisplayStatus = typeof displayStatus === "function" ? displayStatus : null;

if (oldDisplayStatus) {
    displayStatus = function(status) {
        oldDisplayStatus(status);
        updateDataChain(status);
    };
}


/* ==========================================================================
   CHAINE DE DONNEES - AFFICHAGE OPERATIONNEL
   ========================================================================== */

function updateDataChain(status) {

    if (!status) return;

    const generated = status.generated_at;

    function formatDateUTC(value) {
        if (!value) return "—";
        return new Date(value).toLocaleString("fr-FR", {
            timeZone: "UTC",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }) + " UTC";
    }

    function delay(value) {
        if (!value || !generated) return "—";
        return Math.round(
            (new Date(generated) - new Date(value)) / 60000
        ) + " min";
    }

    function set(id, html) {
        const element = document.getElementById(id);
        if (element) element.innerHTML = html;
    }

    set("chain-meteo", `
        Source : ${status.meteo.source || "Météo-France stations"}<br>
        Type : observation réelle<br>
        Donnée : ${formatDateUTC(status.meteo.date)}<br>
        Intégration : ${formatDateUTC(generated)}<br>
        Délai : ${delay(status.meteo.date)}
    `);

    set("chain-hydro", `
        Source : ${status.hydro.source || "Vigicrues / Hub'Eau"}<br>
        Type : observation réelle<br>
        Donnée : ${formatDateUTC(status.hydro.date)}<br>
        Délai : ${delay(status.hydro.date)}
    `);

    set("chain-radar", `
        Source : ${status.radar.source || "Météo-France radar"}<br>
        Type : estimation radar<br>
        Donnée : ${formatDateUTC(status.radar.date)}<br>
        Délai : ${delay(status.radar.date)}
    `);

    set("chain-arome", `
        Source : ${status.arome.source || "Météo-France AROME"}<br>
        Type : prévision numérique<br>
        Run : ${formatDateUTC(status.arome.run)}<br>
        Échéance : ${status.arome.echeance || "—"}
    `);

    set("chain-incendie", `
        Type : indicateur calculé<br>
        Niveau : ${status.incendie.niveau}<br>
        Méthode : ${status.incendie.methode}<br>
        Attention : non officiel
    `);
}

