import { Credentials } from '../src/server/modules';

const credentials: Credentials = {
    type: 'csv',
    options: {
        delimiter: ',',
        file: 'data/study.csv'
    },
    aggregations: [],
    dimensions: [
        {
            column: 'pl_letter',
            displayName: 'Planet Letter',
            type: 'categorical'
        },
        {
            column: 'pl_name',
            displayName: 'Planet Name',
            type: 'categorical'
        },
        {
            column: 'pl_discmethod',
            displayName: 'Discovery Method',
            type: 'categorical'
        },
        {
            column: 'pl_orbper',
            displayName: 'Orbital Period (Days)',
            type: 'metric',
            treatZeroAsNull: true
        },
        {
            column: 'pl_dens',
            displayName: 'Planet Density (g/cm^3)',
            type: 'metric',
            max: 20,
            treatZeroAsNull: true
        },

        {
            column: 'st_dist',
            displayName: 'Distance (pc)',
            type: 'metric',
            max: 3000,
            treatZeroAsNull: true
        },
        {
            column: 'gaia_dist',
            displayName: 'Gaia Distance (pc)',
            type: 'metric',
            max: 3000,
            treatZeroAsNull: true
        },

        {
            column: 'st_teff',
            displayName: 'Effective Temperature (K)',
            type: 'metric',
            treatZeroAsNull: true
        },
        {
            column: 'st_mass',
            displayName: 'Stellar Mass (Solar mass)',
            type: 'metric',
            treatZeroAsNull: true
        },
        {
            column: 'pl_angsep',
            displayName: 'Calculated Angular Separation (mas)',
            type: 'metric',
            max: 400,
            treatZeroAsNull: true
        },

        {
            column: 'pl_bmasse',
            displayName: 'Planet Mass or M*sin(i) (Earth mass)',
            type: 'metric',
            treatZeroAsNull: true
        },
        {
            column: 'pl_disc',
            displayName: 'Year of Discovery',
            type: 'time',
            format: 'YYYY'
        },
        {
            column: 'pl_locale',
            displayName: 'Discovery Locale',
            type: 'categorical'
        },
        {
            column: 'pl_st_npar',
            displayName: 'Number of Stellar and Planet Parameters',
            type: 'metric',
            treatZeroAsNull: true
        },
        {
            column: 'pl_facility',
            displayName: 'Discovery Facility',
            type: 'categorical'
        },
        {
            column: 'pl_st_nref',
            displayName: 'Number of Stellar and Planet References',
            type: 'metric',
            treatZeroAsNull: true
        },
        {
            column: 'st_glon',
            displayName: 'Galactic Longitude (deg)',
            type: 'metric',
            treatZeroAsNull: true,
            min: 0,
            max: 360
        },
        {
            column: 'st_glat',
            displayName: 'Galactic Latitude (deg)',
            type: 'metric',
            treatZeroAsNull: true,
            min: -90,
            max: 90
        },
        {
            column: 'st_elon',
            displayName: 'Ecliptic Longitude (deg)',
            type: 'metric',
            treatZeroAsNull: true,
            min: 0,
            max: 360
        },
        {
            column: 'st_elat',
            displayName: 'Ecliptic Latitude (deg)',
            type: 'metric',
            treatZeroAsNull: true,
            min: -90,
            max: 90
        },
        {
            column: 'st_logg',
            displayName: 'Stellar Surface Gravity (log10(cm/s**2))',
            type: 'metric',
            treatZeroAsNull: true
        },
        {
            column: 'st_lum',
            displayName: 'Stellar Luminosity (log(Solar))',
            type: 'metric',
            treatZeroAsNull: true
        }
    ]
};

export const StudyData = credentials;