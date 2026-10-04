<?php

return [

    /*
    |---------------------------------------------------------------------------
    | Regions
    |---------------------------------------------------------------------------
    |
    | The platform only accepts Nigerian addresses, so the state list is a fixed
    | constant rather than a lookup table. It lives here rather than inline in a
    | controller so that the registration rules, the profile editor and the
    | company editor all validate against one list, and so widening it later is
    | a config change rather than a code change in three places.
    |
    | 36 states plus the Federal Capital Territory.
    |
    */

    'country' => 'Nigeria',

    'country_code' => 'NG',

    'states' => [
        'Abia',
        'Adamawa',
        'Akwa Ibom',
        'Anambra',
        'Bauchi',
        'Bayelsa',
        'Benue',
        'Borno',
        'Cross River',
        'Delta',
        'Ebonyi',
        'Edo',
        'Ekiti',
        'Enugu',
        'Federal Capital Territory',
        'Gombe',
        'Imo',
        'Jigawa',
        'Kaduna',
        'Kano',
        'Katsina',
        'Kebbi',
        'Kogi',
        'Kwara',
        'Lagos',
        'Nasarawa',
        'Niger',
        'Ogun',
        'Ondo',
        'Osun',
        'Oyo',
        'Plateau',
        'Rivers',
        'Sokoto',
        'Taraba',
        'Yobe',
        'Zamfara',
    ],

];