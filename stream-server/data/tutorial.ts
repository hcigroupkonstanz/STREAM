import { Credentials } from '../src/server/modules';

const credentials: Credentials = {
    type: 'csv',
    options: {
        file: 'data/tutorial.csv',
        delimiter: ',',
    },
    aggregations: [],
    dimensions: [
        {
            column: 'Survived',
            displayName: 'Survived',
            type: 'categorical',
            mapping: {
                'yes': 0,
                'no': 1
            }
        },
        {
            column: 'Pclass',
            displayName: 'Passenger class',
            type: 'metric'
        },
        {
            column: 'Name',
            displayName: 'Name',
            type: 'categorical'
        },
        {
            column: 'Sex',
            displayName: 'Sex',
            type: 'categorical',
            mapping: {
                'male': 0,
                'female': 1
            }
        },
        {
            column: 'Siblings/Spouses Aboard',
            displayName: 'Siblings/Spouses Aboard',
            type: 'metric'
        },
        {
            column: 'Parents/Children Aboard',
            displayName: 'Parents/Children Aboard',
            type: 'metric'
        },
        {
            column: 'Fare',
            displayName: 'Fare',
            type: 'metric'
        },
    ]
};

module.exports = credentials;
