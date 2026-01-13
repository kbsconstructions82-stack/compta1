export interface RouteTariff {
    departure: string;
    destination: string;
    price: number; // Tarif de facturation (ce que gagne la société)
}

// Liste des destinations disponibles depuis Kairouan (pour les dropdowns)
export const AVAILABLE_DESTINATIONS = [
    'Sidi Lheni', 'Sousse', 'Sfax', 'Bizerte', 'Ras Jebel', 'Menzel Bourguiba',
    'Siliana', 'Bouarada', 'Tozeur', 'Gabes', 'Medjez el Bab', 'Tunis',
    'Grombalia', 'Beja', 'Le Kef', 'Tebourba', 'Hammam Zriba', 'Jemmal',
    'El Jem', 'Kerker', 'Chebba', 'Djerba', 'Zarzis', 'Medenine',
    'Douz', 'Nefta'
];

// Tarifs de facturation (ce que la société gagne par trajet)
// Source: tarif_facture et salarié.md - Colonne "Facture"
// Format du fichier: "214,000" = 214 TND (format avec virgule comme séparateur dans le markdown)
// Les valeurs sont en dinars tunisiens (TND)
export const NEW_BOX_RATES: RouteTariff[] = [
    { departure: 'kairouan', destination: 'sidi lheni', price: 214 }, // sidl lheni: 214,000 = 214 TND
    { departure: 'kairouan', destination: 'sousse', price: 342 }, // sousse: 342,000 = 342 TND
    { departure: 'kairouan', destination: 'sfax', price: 535 }, // sfax: 535,000 = 535 TND
    { departure: 'kairouan', destination: 'bizerte', price: 600 }, // bizerte: 600,000 = 600 TND
    { departure: 'kairouan', destination: 'ras jebel', price: 570 }, // Rasjbal-manzelbourguiba: 570,000 = 570 TND
    { departure: 'kairouan', destination: 'menzel bourguiba', price: 570 }, // 570,000 = 570 TND
    { departure: 'kairouan', destination: 'siliana', price: 428 }, // sillana: 428,000 = 428 TND
    { departure: 'kairouan', destination: 'bouarada', price: 428 }, // sillana-bouarada: 428,000 = 428 TND
    { departure: 'kairouan', destination: 'tozeur', price: 803 }, // touzeur: 803,000 = 803 TND
    { departure: 'kairouan', destination: 'gabes', price: 696 }, // gabes: 696,000 = 696 TND
    { departure: 'kairouan', destination: 'medjez el bab', price: 430 }, // Mdjez el beb: 430,000 = 430 TND
    { departure: 'kairouan', destination: 'tunis', price: 507 }, // tunis: 507,000 = 507 TND
    { departure: 'kairouan', destination: 'grombalia', price: 470 }, // GROMBELIA: 470,000 = 470 TND
    { departure: 'kairouan', destination: 'beja', price: 600 }, // Beja: 600,000 = 600 TND
    { departure: 'kairouan', destination: 'le kef', price: 600 }, // Kef: 600,000 = 600 TND
    { departure: 'kairouan', destination: 'tebourba', price: 550 }, // tborba: 550,000 = 550 TND
    { departure: 'kairouan', destination: 'hammam zriba', price: 435 }, // hamen-zriba: 435,000 = 435 TND
    { departure: 'kairouan', destination: 'jemmal', price: 350 }, // jammel: 350,000 = 350 TND
    { departure: 'kairouan', destination: 'kairouan', price: 64 }, // kairouan: 64,000 = 64 TND
    { departure: 'kairouan', destination: 'el jem', price: 360 }, // ELJAM ou KARKER: 360,000 = 360 TND
    { departure: 'kairouan', destination: 'kerker', price: 360 }, // KARKER: 360,000 = 360 TND
    { departure: 'kairouan', destination: 'chebba', price: 475 }, // chebba: 475,000 = 475 TND
    { departure: 'kairouan', destination: 'djerba', price: 940 }, // JERBA: 940,000 = 940 TND
    { departure: 'kairouan', destination: 'zarzis', price: 880 }, // JERUS (assumant Zarzis): 880,000 = 880 TND
    { departure: 'kairouan', destination: 'medenine', price: 840 }, // MEDNINE: 840,000 = 840 TND
    { departure: 'kairouan', destination: 'douz', price: 980 }, // DOUZ: 980,000 = 980 TND
    { departure: 'kairouan', destination: 'nefta', price: 848 }, // NAFTA: 848,000 = 848 TND
];

// Fonction pour formater une ville avec capitalisation correcte
const formatCityName = (city: string): string => {
    return city
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Liste formatée pour les dropdowns (format: "Kairouan → Destination")
// DOIT être défini APRÈS NEW_BOX_RATES pour éviter l'erreur d'initialisation
export const FORMATTED_ROUTES = NEW_BOX_RATES.map(route => {
    const formattedDestination = formatCityName(route.destination);
    return {
        value: `${route.departure}-${route.destination}`,
        label: `Kairouan → ${formattedDestination} (${route.price.toFixed(3)} TND HT)`,
        departure: route.departure,
        destination: route.destination, // Garder en minuscules pour la recherche
        formattedDestination: formattedDestination, // Version formatée pour affichage
        price: route.price
    };
});

// Version sans prix pour les chauffeurs (masquer les tarifs)
export const FORMATTED_ROUTES_WITHOUT_PRICE = NEW_BOX_RATES.map(route => {
    const formattedDestination = formatCityName(route.destination);
    return {
        value: `${route.departure}-${route.destination}`,
        label: `Kairouan → ${formattedDestination}`, // Sans prix
        departure: route.departure,
        destination: route.destination,
        formattedDestination: formattedDestination,
        price: route.price // Prix conservé en arrière-plan pour calculs
    };
});

// Helper to normalize strings for robust matching
// Gère les variations: "sidi lheni", "sidl lheni", "Sidi El Heni", etc.
export const normalizeCity = (city: string): string => {
    return city.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents (é -> e, è -> e)
        .trim()
        .replace(/-/g, " ") // "sidi-lheni" -> "sidi lheni"
        .replace(/el\s+/g, " ") // "sidi el heni" -> "sidi heni" (simplification)
        .replace(/\s+/g, ' ') // Multiple spaces -> single space
        .replace(/^(kairouja|kairouan)$/i, 'kairouan') // Normaliser KAIROUJA -> kairouan
        .replace(/^(jerba|djerba)$/i, 'djerba') // JERBA -> djerba
        .replace(/^(jerus|zarzis)$/i, 'zarzis') // JERUS -> zarzis (assumption)
        .replace(/^(grombelia|grombalia)$/i, 'grombalia') // GROMBELIA -> grombalia
        .replace(/^(sidi lheni|sidl lheni|sidi el heni)$/i, 'sidi lheni') // Normaliser variations
        .replace(/^(sillana|siliana)$/i, 'siliana') // sillana -> siliana
        .replace(/^(touzeur|tozeur)$/i, 'tozeur') // touzeur -> tozeur
        .replace(/^(mdjez el beb|medjez el bab)$/i, 'medjez el bab') // Normaliser
        .replace(/^(rasjbal|ras jebel)$/i, 'ras jebel') // Normaliser
        .replace(/^(menzel bourguiba|manzelbourguiba)$/i, 'menzel bourguiba') // Normaliser
        .trim();
};

// Fonction pour obtenir le tarif de facturation (ce que gagne la société)
// Fonctionne pour TOUS les clients basé sur le trajet (départ -> arrivée)
export const getClientRate = (clientName: string, departure: string, destination: string): number | null => {
    const normDep = normalizeCity(departure);
    const normDest = normalizeCity(destination);

    // 1. Try exact match (kairouan -> destination)
    const exactRate = NEW_BOX_RATES.find(r => {
        const rDep = normalizeCity(r.departure);
        const rDest = normalizeCity(r.destination);
        return (rDep === normDep && rDest === normDest);
    });

    if (exactRate) return exactRate.price;

    // 2. Try reverse match (destination -> kairouan) - some tariffs might be bidirectional
    const reverseRate = NEW_BOX_RATES.find(r => {
        const rDep = normalizeCity(r.departure);
        const rDest = normalizeCity(r.destination);
        return (rDep === normDest && rDest === normDep);
    });

    if (reverseRate) return reverseRate.price;

    // 3. Fuzzy match - try partial destination matching
    const fuzzy = NEW_BOX_RATES.find(r => {
        const rDest = normalizeCity(r.destination);
        const rDep = normalizeCity(r.departure);
        // Check if destination contains known city or vice versa
        return (normDest.includes(rDest) || rDest.includes(normDest)) && 
               (normDep.includes(rDep) || rDep.includes(normDep));
    });

    return fuzzy ? fuzzy.price : null;
};

// --- EMPLOYEE BONUSES (PRIMES CHAUFFEUR) ---

// Primes de trajet pour les chauffeurs (prime salarié)
// Source: tarif_facture et salarié.md - Colonne "prime (salarié)" (en TND)
export const EMPLOYEE_RATES: RouteTariff[] = [
    { departure: 'kairouan', destination: 'sidi lheni', price: 20 }, // sidl lheni
    { departure: 'kairouan', destination: 'sousse', price: 20 },
    { departure: 'kairouan', destination: 'sfax', price: 30 },
    { departure: 'kairouan', destination: 'bizerte', price: 35 },
    { departure: 'kairouan', destination: 'ras jebel', price: 35 },
    { departure: 'kairouan', destination: 'menzel bourguiba', price: 35 },
    { departure: 'kairouan', destination: 'siliana', price: 25 },
    { departure: 'kairouan', destination: 'bouarada', price: 25 },
    { departure: 'kairouan', destination: 'tozeur', price: 50 },
    { departure: 'kairouan', destination: 'gabes', price: 50 },
    { departure: 'kairouan', destination: 'medjez el bab', price: 25 },
    { departure: 'kairouan', destination: 'tunis', price: 30 },
    { departure: 'kairouan', destination: 'grombalia', price: 30 },
    { departure: 'kairouan', destination: 'beja', price: 25 },
    { departure: 'kairouan', destination: 'le kef', price: 25 },
    { departure: 'kairouan', destination: 'tebourba', price: 30 },
    { departure: 'kairouan', destination: 'hammam zriba', price: 30 },
    { departure: 'kairouan', destination: 'jemmal', price: 20 },
    { departure: 'kairouan', destination: 'kairouan', price: 5 },
    { departure: 'kairouan', destination: 'el jem', price: 20 }, // ELJAM
    { departure: 'kairouan', destination: 'kerker', price: 20 }, // KARKER
    { departure: 'kairouan', destination: 'chebba', price: 20 },
    { departure: 'kairouan', destination: 'djerba', price: 50 }, // JERBA
    { departure: 'kairouan', destination: 'zarzis', price: 50 }, // JERUS
    { departure: 'kairouan', destination: 'medenine', price: 50 },
    { departure: 'kairouan', destination: 'douz', price: 50 },
    { departure: 'kairouan', destination: 'nefta', price: 50 },
];

// Fonction pour obtenir la prime de trajet pour le chauffeur
// Fonctionne pour TOUS les trajets basé sur le départ et l'arrivée
export const getEmployeeRate = (departure: string, destination: string): number => {
    const normDep = normalizeCity(departure);
    const normDest = normalizeCity(destination);

    // 1. Exact Match (départ exact -> destination exacte)
    const exactRate = EMPLOYEE_RATES.find(r => {
        const rDep = normalizeCity(r.departure);
        const rDest = normalizeCity(r.destination);
        return (rDep === normDep && rDest === normDest);
    });

    if (exactRate) return exactRate.price;

    // 2. Reverse Match (destination -> départ) - si bidirectionnel
    const reverseRate = EMPLOYEE_RATES.find(r => {
        const rDep = normalizeCity(r.departure);
        const rDest = normalizeCity(r.destination);
        return (rDep === normDest && rDest === normDep);
    });

    if (reverseRate) return reverseRate.price;

    // 3. Fuzzy Match - match partiel sur la destination (ex: "Sousse Sahloul" -> "Sousse")
    const fuzzy = EMPLOYEE_RATES.find(r => {
        const rDep = normalizeCity(r.departure);
        const rDest = normalizeCity(r.destination);
        // Vérifier si le départ correspond (kairouan) ET si la destination correspond partiellement
        if (rDep === normDep || normDep.includes(rDep) || rDep.includes(normDep)) {
            return normDest.includes(rDest) || rDest.includes(normDest);
        }
        return false;
    });

    return fuzzy ? fuzzy.price : 0;
};
