// Curated collection definitions per city
// Each collection maps to a rich prompt for the ItineraryPlanner

export interface CollectionMeta {
  slug: string;
  title: string;
  description: string;
  icon: string;
  tags: string[];
  stops: number;
}

export interface CollectionDefinition extends CollectionMeta {
  prompt: string;
}

export type CityCollections = Record<string, CollectionDefinition[]>;

const collections: CityCollections = {
  london: [
    {
      slug: 'pub-history-walk',
      title: 'Pub History Walk',
      description: "A crawl through London's most storied pubs, from Ye Olde Cheshire Cheese to The Lamb and Flag",
      icon: 'sports_bar',
      tags: ['History', 'Pubs'],
      stops: 4,
      prompt:
        'Plan a historic London pub crawl visiting the most legendary and atmospheric pubs in central London. ' +
        'Start at Ye Olde Cheshire Cheese on Fleet Street (a Samuel Johnson and Dickens haunt), then move through ' +
        'pubs like The Lamb and Flag in Covent Garden, The George Inn in Southwark (London\'s last galleried coaching inn), ' +
        'and The Prospect of Whitby in Wapping. Focus on pubs with genuine history dating back centuries, with ' +
        'dark-wood interiors, real ale on cask, and stories to tell. Include 4-5 stops with enough time to enjoy ' +
        'a pint at each. Keep the route walkable or use short tube hops. Atmosphere: cozy, literary, old-world.',
    },
    {
      slug: 'hidden-shoreditch',
      title: 'Hidden Gems of Shoreditch',
      description: 'Street art, vinyl shops, and hole-in-the-wall eateries in East London',
      icon: 'explore',
      tags: ['Culture', 'Street Art'],
      stops: 4,
      prompt:
        'Plan a day exploring the hidden side of Shoreditch and East London. Start with street art around ' +
        'Brick Lane and the backstreets off Redchurch Street. Include independent vinyl record shops, vintage ' +
        'boutiques, tiny galleries, and hole-in-the-wall eateries that locals love. Visit spots like Boxpark ' +
        'or the Columbia Road area. Include a specialty coffee stop, a street food lunch at a market, and an ' +
        'afternoon browsing indie shops. End with cocktails at an off-the-beaten-path bar. Focus on authentically ' +
        'local, non-touristy spots in Shoreditch, Hoxton, and Bethnal Green. Atmosphere: creative, gritty-cool, independent.',
    },
    {
      slug: 'royal-parks',
      title: 'Royal Parks & Gardens',
      description: 'A green route through Hyde Park, Kensington Gardens, and Regent\'s Park',
      icon: 'park',
      tags: ['Nature', 'Walking'],
      stops: 4,
      prompt:
        'Plan a relaxing day walking through London\'s most beautiful Royal Parks. Start in Hyde Park near the ' +
        'Serpentine, cross into Kensington Gardens to see the Italian Gardens and Kensington Palace. Include a ' +
        'cafe stop at one of the park pavilions. Then head north to Regent\'s Park, visiting Queen Mary\'s Rose ' +
        'Garden and the boating lake. Include 4-5 stops at scenic landmarks, gardens, and cafes within or adjacent ' +
        'to the parks. Keep the pace leisurely with time to enjoy the greenery. If possible, end near Primrose Hill ' +
        'for views over the city. Atmosphere: peaceful, scenic, quintessentially English.',
    },
    {
      slug: 'best-coffee-zone1',
      title: 'Best Coffee in Zone 1',
      description: 'Third-wave roasters and hidden espresso bars in central London',
      icon: 'coffee',
      tags: ['Coffee', 'Specialty'],
      stops: 4,
      prompt:
        'Plan a specialty coffee tour through central London (Zone 1). Visit the best third-wave coffee shops ' +
        'and micro-roasters. Include places like Monmouth Coffee in Borough Market, Prufrock Coffee in Clerkenwell, ' +
        'Kaffeine near Great Titchfield Street, Rosslyn Coffee near the Royal Exchange, and Workshop Coffee in ' +
        'Fitzrovia. Each stop should be a serious specialty coffee destination known for excellent single-origin ' +
        'pour-overs or perfectly pulled espresso. Include 4-5 stops with light pastry or brunch pairings at the ' +
        'best ones. Keep the route efficient across Fitzrovia, Soho, Clerkenwell, and the City. Atmosphere: ' +
        'minimalist, artisan, caffeine-fuelled.',
    },
    {
      slug: 'thames-sunset',
      title: 'Thames Sunset Walk',
      description: 'A golden hour stroll from Tower Bridge to Westminster',
      icon: 'wb_twilight',
      tags: ['Scenic', 'Romance'],
      stops: 4,
      prompt:
        'Plan a romantic golden-hour walk along the South Bank of the Thames from Tower Bridge to Westminster. ' +
        'Start at Tower Bridge for views, then stroll west past City Hall, the Scoop amphitheatre, and HMS Belfast. ' +
        'Continue through Borough Market area, past the Tate Modern and Shakespeare\'s Globe, across the Millennium ' +
        'Bridge views to St Paul\'s. Walk along the Southbank Centre, past the Royal Festival Hall and the London Eye, ' +
        'ending at Westminster Bridge with Big Ben views. Include 4-5 stops: a pre-walk drink, a scenic photo spot, ' +
        'a riverside dining option, and a nightcap bar. Time the walk so the middle section hits golden hour. ' +
        'Atmosphere: romantic, cinematic, magical light.',
    },
  ],
  boston: [
    {
      slug: 'harbor-seafood',
      title: 'Harbor Seafood Trail',
      description: "From Seaport lobster rolls to North End oysters, explore Boston's finest catches",
      icon: 'restaurant',
      tags: ['Seafood', 'Dining'],
      stops: 4,
      prompt:
        'Plan a seafood-focused day in Boston starting at the Seaport District. Begin with a lobster roll at a ' +
        'waterfront spot like Yankee Lobster or Row 34. Move to the historic waterfront near Faneuil Hall for ' +
        'an oyster bar. Head to the North End for Italian-influenced seafood at a classic restaurant. Include ' +
        '4-5 stops covering lobster rolls, raw oysters, clam chowder, and fresh catches. Mix casual seafood shacks ' +
        'with upscale harbor-view restaurants. Walk along the Harborwalk between stops. End with drinks at a ' +
        'waterfront bar in the Seaport. Atmosphere: maritime, fresh, indulgent.',
    },
    {
      slug: 'academic-roast',
      title: 'Academic Roast',
      description: 'The quietest, most inspiring study nooks and roasteries in Cambridge',
      icon: 'coffee',
      tags: ['Coffee', 'Historic'],
      stops: 4,
      prompt:
        'Plan a coffee-and-culture tour through Cambridge, MA, near Harvard and MIT. Visit the best independent ' +
        'roasters and cozy study cafes. Include places like Broadsheet Coffee Roasters, Lamplighter Brewing Co\'s ' +
        'cafe, 1369 Coffee House, Dado Tea, and Tatte Bakery. Walk through Harvard Yard and past MIT\'s Stata ' +
        'Center between stops. Include 4-5 coffee shops known for their quiet atmosphere, great beans, and ' +
        'scholarly vibe. Each should have character — exposed brick, bookshelves, or university views. ' +
        'Atmosphere: intellectual, cozy, inspiring.',
    },
    {
      slug: 'cobblestone-romance',
      title: 'Cobblestone Romance',
      description: "Speakeasies and sunset strolls through Beacon Hill's most romantic alleyways",
      icon: 'favorite',
      tags: ['Romance', 'Nature'],
      stops: 4,
      prompt:
        'Plan a romantic day in Boston centered on Beacon Hill and the Back Bay. Start with brunch at a charming ' +
        'Beacon Hill cafe on Charles Street. Stroll down Acorn Street (the most photographed street in America) ' +
        'and through the gaslit alleyways. Walk through the Boston Public Garden and along the Esplanade. ' +
        'Include an afternoon stop at a hidden speakeasy like Brick & Mortar or Yvonne\'s. End with dinner at ' +
        'an intimate restaurant and sunset views from the Esplanade along the Charles River. Include 4-5 stops ' +
        'with a mix of cozy dining, scenic walks, and cocktail spots. Atmosphere: intimate, gaslit, old-world charm.',
    },
    {
      slug: 'freedom-trail-remix',
      title: 'Freedom Trail Remix',
      description: 'The classic trail reimagined with modern food and drink stops between historic sites',
      icon: 'castle',
      tags: ['History', 'Walking'],
      stops: 4,
      prompt:
        'Plan a reimagined Freedom Trail walk that mixes Boston\'s historic sites with modern food and drink stops. ' +
        'Start at Boston Common, visit the State House, then stop for a craft coffee at a nearby roaster. Continue ' +
        'to the Old North Church in the North End, then break for the best cannoli (Mike\'s Pastry vs Modern Pastry). ' +
        'Visit Paul Revere\'s House, then cross to Charlestown for the Bunker Hill Monument with a craft beer stop at ' +
        'a local brewery. Include 4-5 historic sites interleaved with 3-4 food/drink stops. Make it feel fresh, not ' +
        'like a textbook tour. Atmosphere: historic-meets-modern, walkable, satisfying.',
    },
    {
      slug: 'fenway-day',
      title: 'Fenway Day Out',
      description: 'The full Fenway experience - pre-game eats, the park, and post-game bars',
      icon: 'stadium',
      tags: ['Sports', 'Local'],
      stops: 4,
      prompt:
        'Plan a full day around the Fenway Park experience in Boston. Start with brunch in the Fenway-Kenmore area. ' +
        'Include pre-game stops at iconic spots like the Bleacher Bar (with its garage-door view into the park), ' +
        'Tasty Burger, or Eastern Standard. Walk through the Fenway neighborhood and Lansdowne Street. After the ' +
        'game, hit post-game bars like Game On or Cask \'n Flagon. Include 4-5 stops covering pre-game food, the ' +
        'ballpark atmosphere, and post-game nightlife along Lansdowne and Brookline Ave. Atmosphere: electric, ' +
        'local, all-American gameday.',
    },
  ],
  nyc: [
    {
      slug: 'brooklyn-brunch',
      title: 'Brooklyn Brunch',
      description: 'Williamsburg to DUMBO, the definitive Brooklyn morning',
      icon: 'brunch_dining',
      tags: ['Brunch', 'Brooklyn'],
      stops: 4,
      prompt:
        'Plan a Brooklyn brunch crawl starting in Williamsburg and ending in DUMBO. Begin with coffee at a ' +
        'Williamsburg roaster like Devocion or Partners Coffee. Have a proper brunch at a beloved spot like ' +
        'Egg, Five Leaves, or Sunday in Brooklyn. Walk through McCarren Park, browse vintage shops on Bedford Ave, ' +
        'then head toward DUMBO for waterfront views of the Manhattan skyline from Brooklyn Bridge Park. Include ' +
        'a stop at Time Out Market or Juliana\'s Pizza. End with coffee or a sweet treat with views of the Brooklyn ' +
        'Bridge. Include 4-5 stops. Atmosphere: laid-back, trendy, photogenic.',
    },
    {
      slug: 'speakeasy-circuit',
      title: 'Speakeasy Circuit',
      description: 'Hidden bars behind phone booths, bookshops, and hot dog stands',
      icon: 'nightlife',
      tags: ['Nightlife', 'Cocktails'],
      stops: 4,
      prompt:
        'Plan an evening speakeasy tour through Manhattan\'s hidden cocktail bars. Start at Please Don\'t Tell (PDT) ' +
        'in the East Village, entered through a phone booth inside a hot dog shop. Visit Attaboy on the Lower East Side ' +
        '(no menu, bartender\'s choice). Include Death & Co, Employees Only in the West Village, and Angel\'s Share ' +
        'in the East Village. Each bar should have a secret entrance or hidden location — behind a bookshelf, through ' +
        'a unmarked door, or disguised as something else. Include 4-5 bars with time for 1-2 cocktails at each. ' +
        'Start around 7-8pm. Atmosphere: mysterious, prohibition-era glamour, craft cocktails.',
    },
    {
      slug: 'rooftop-sunset',
      title: 'Rooftop Sunset Tour',
      description: "Chase the golden hour across Manhattan's best rooftop bars",
      icon: 'roofing',
      tags: ['Views', 'Drinks'],
      stops: 4,
      prompt:
        'Plan a rooftop bar tour across Manhattan timed for sunset. Start mid-afternoon at a rooftop with skyline ' +
        'views like 230 Fifth or Westlight in Brooklyn. Move to a Midtown rooftop like Bar SixtyFive at Rainbow Room ' +
        'or the St. Cloud at the Knickerbocker for golden hour. Catch sunset at a spot with unobstructed western views. ' +
        'End the evening at a Lower Manhattan rooftop or one with Empire State Building views. Include 3-4 rooftop bars ' +
        'with the best views in NYC, timed so the middle stop catches the sunset. Atmosphere: glamorous, sky-high, ' +
        'golden light, cosmopolitan.',
    },
    {
      slug: 'chinatown-little-italy',
      title: 'Chinatown to Little Italy',
      description: 'A cross-cultural food walk through two iconic neighborhoods',
      icon: 'ramen_dining',
      tags: ['Food', 'Culture'],
      stops: 4,
      prompt:
        'Plan a food-focused walking tour from Chinatown through Little Italy in Lower Manhattan. Start with dim sum ' +
        'at Nom Wah Tea Parlor or Jing Fong. Explore the streets of Chinatown — Canal Street, Mott Street, Doyers Street ' +
        '(the Bloody Angle). Pick up boba tea and Chinese pastries. Cross into Little Italy on Mulberry Street for ' +
        'fresh pasta or a slice. End with a cannoli from Ferrara Bakery or Caffe Palermo. Include 5-6 food stops across ' +
        'both neighborhoods — dumplings, noodles, pastries, espresso, cannoli. The route should feel like a journey ' +
        'between two worlds in a few blocks. Atmosphere: bustling, flavorful, culturally rich.',
    },
    {
      slug: 'museum-marathon',
      title: 'Museum Marathon',
      description: 'MoMA, the Met, and the hidden galleries in between',
      icon: 'museum',
      tags: ['Art', 'Culture'],
      stops: 4,
      prompt:
        'Plan a museum and gallery day in Manhattan. Start at MoMA in Midtown for modern art, then walk through ' +
        'Central Park to the Metropolitan Museum of Art on the Upper East Side. Include a stop at a smaller gallery ' +
        'like the Neue Galerie, the Frick Collection, or a Chelsea gallery. Break for lunch at a museum cafe or a ' +
        'nearby restaurant. End at an unexpected cultural spot like the Morgan Library or the Whitney in the Meatpacking ' +
        'District. Include 3-4 museum/gallery stops with food and coffee breaks between them. Pace it so you don\'t ' +
        'get museum fatigue. Atmosphere: inspiring, cerebral, world-class art.',
    },
  ],
  austin: [
    {
      slug: 'live-music-crawl',
      title: 'Live Music Crawl',
      description: "6th Street to Rainey Street, catch live sets at Austin's legendary venues",
      icon: 'music_note',
      tags: ['Music', 'Nightlife'],
      stops: 4,
      prompt:
        'Plan an evening live music crawl through Austin\'s legendary venues. Start on 6th Street (Dirty Sixth) with ' +
        'early sets at bars like The Continental Club on South Congress or Antone\'s. Move through the Red River ' +
        'Cultural District for indie and rock at Mohawk or Stubb\'s. End the night on Rainey Street with drinks at ' +
        'a converted bungalow bar. Include 4-5 venues spanning different genres — blues, country, indie rock, singer-songwriter. ' +
        'Each venue should have live music and character. Include a BBQ or taco stop for fuel between sets. ' +
        'Atmosphere: loud, authentic, the Live Music Capital of the World.',
    },
    {
      slug: 'taco-trail',
      title: 'Taco Trail',
      description: 'Breakfast tacos to late-night al pastor, the essential Austin taco map',
      icon: 'lunch_dining',
      tags: ['Tacos', 'Local'],
      stops: 4,
      prompt:
        'Plan a full-day taco tour of Austin, from breakfast to late night. Start with breakfast tacos at Veracruz ' +
        'All Natural or Tacodeli in the morning. Mid-morning, hit a food truck on South First or East Cesar Chavez. ' +
        'For lunch, visit Valentina\'s Tex Mex BBQ or Pueblo Viejo. In the afternoon, browse South Congress and grab ' +
        'a snack taco at Torchy\'s or a street vendor. End with late-night al pastor tacos at a taqueria on East Riverside ' +
        'or a food truck park. Include 5-6 taco stops across different neighborhoods and styles — breakfast tacos, ' +
        'barbacoa, al pastor, birria, Tex-Mex. Atmosphere: casual, authentic, taco-obsessed.',
    },
    {
      slug: 'keep-austin-weird',
      title: 'Keep Austin Weird',
      description: 'Murals, oddities, and the most Instagrammable weird spots',
      icon: 'palette',
      tags: ['Quirky', 'Culture'],
      stops: 4,
      prompt:
        'Plan a day exploring Austin\'s weirdest and most Instagrammable spots. Start at the "Greetings from Austin" ' +
        'mural on South First, then visit the Cathedral of Junk (if open) or the HOPE Outdoor Gallery murals. ' +
        'Browse Uncommon Objects on South Congress for vintage oddities. Visit the bats at Congress Avenue Bridge ' +
        '(seasonal). Include a stop at a quirky food truck park like The Picnic. Walk South Congress for its murals, ' +
        'boots, and boutiques. Include 4-5 stops at the most uniquely Austin attractions — street art, oddity shops, ' +
        'themed bars, and local landmarks. Atmosphere: eccentric, colorful, proudly weird.',
    },
    {
      slug: 'east-side-coffee',
      title: 'East Side Coffee',
      description: "East Austin's finest roasters and cafe culture",
      icon: 'coffee',
      tags: ['Coffee', 'Hip'],
      stops: 4,
      prompt:
        'Plan a coffee tour through East Austin\'s thriving cafe scene. Visit the best roasters and cafes along ' +
        'East Cesar Chavez, East 6th, and the Holly neighborhood. Include spots like Flat Track Coffee, Merit Coffee, ' +
        'Cenote on East Cesar Chavez, and Figure 8 Coffee Purveyors. Each stop should be a serious specialty coffee ' +
        'destination with great beans and atmosphere. Browse the street art and boutiques between stops. Include ' +
        '4-5 coffee shops with a breakfast taco or pastry pairing at the best ones. Atmosphere: hip, creative, ' +
        'East Austin cool.',
    },
    {
      slug: 'lady-bird-lake',
      title: 'Lady Bird Lake Day',
      description: 'Kayaks, trails, and waterside dining along the Colorado River',
      icon: 'kayaking',
      tags: ['Outdoors', 'Active'],
      stops: 4,
      prompt:
        'Plan an active day around Lady Bird Lake (the Colorado River) in Austin. Start with morning coffee near ' +
        'the Pfluger Pedestrian Bridge, then rent kayaks or paddleboards from a lakeside outfitter. Paddle the calm ' +
        'waters with views of the downtown skyline. After, walk or jog the Ann and Roy Butler Hike-and-Bike Trail. ' +
        'Have lunch at a waterside restaurant like Hula Hut or a food truck near Barton Springs. Cool off at Barton ' +
        'Springs Pool in the afternoon. End with sunset drinks at a patio bar overlooking the lake. Include 4-5 stops ' +
        'mixing active outdoor activities with food and drinks. Atmosphere: active, sunny, nature-meets-city.',
    },
  ],
  paris: [
    {
      slug: 'cafe-culture',
      title: 'Café Culture',
      description: 'From corner zinc bars to literary haunts, the essential Parisian café experience',
      icon: 'coffee',
      tags: ['Coffee', 'Culture'],
      stops: 4,
      prompt:
        'Plan a CAFÉ-ONLY itinerary in Paris — every single stop must be a café, coffee shop, or salon de thé. ' +
        'Do NOT include any tourist attractions, monuments, churches, museums, or parks. ONLY cafés. ' +
        'Start at Café de Flore in Saint-Germain-des-Prés for a classic café crème and croissant. ' +
        'Then visit Coutume Café on Rue de Babylone (specialty third-wave roaster). ' +
        'Stop at Café La Palette on Rue de Seine (artist hangout since 1902). ' +
        'Visit Boot Café in Le Marais (tiny specialty espresso bar). ' +
        'End at Café des Deux Moulins in Montmartre (the Amélie café). ' +
        'Every stop MUST be a café or coffee shop. Atmosphere: intellectual, leisurely, quintessentially Parisian.',
    },
    {
      slug: 'hidden-marais',
      title: 'Hidden Marais',
      description: 'Secret courtyards, tiny galleries, and the best falafel you\'ll ever eat',
      icon: 'explore',
      tags: ['Culture', 'Food'],
      stops: 5,
      prompt:
        'Plan a day exploring the hidden side of Le Marais in Paris. Start at Place des Vosges and duck into the secret ' +
        'courtyards of the Hôtel de Sully. Browse tiny independent galleries on Rue de Turenne and Rue Vieille du Temple. ' +
        'Have the legendary falafel at L\'As du Fallafel on Rue des Rosiers. Visit the Musée Carnavalet (free) for Paris ' +
        'history. Browse vintage boutiques and concept stores. End with wine and cheese at a cave à manger. Include 5 stops ' +
        'mixing architecture, food, art, and shopping. Focus on spots tourists walk right past. Atmosphere: intimate, ' +
        'historic, wonderfully lost.',
    },
    {
      slug: 'seine-sunset',
      title: 'Seine at Sunset',
      description: 'A golden hour walk from Notre-Dame to the Eiffel Tower along the river',
      icon: 'wb_twilight',
      tags: ['Scenic', 'Romance'],
      stops: 4,
      prompt:
        'Plan a romantic golden-hour walk along the Seine in Paris. Start at Île de la Cité near Notre-Dame, walk along ' +
        'the Left Bank past the bouquinistes (vintage booksellers). Cross at Pont des Arts for views. Continue through the ' +
        'Tuileries Garden toward Place de la Concorde. Walk along the Right Bank past the Grand Palais. End at the Trocadéro ' +
        'for the iconic Eiffel Tower sunset view. Include 4 stops: a wine bar, a scenic bridge photo spot, a riverside crêpe ' +
        'stand, and a nightcap at a terrace bar with tower views. Time it for golden hour. Atmosphere: romantic, luminous, ' +
        'unforgettable.',
    },
    {
      slug: 'patisserie-trail',
      title: 'Pâtisserie Trail',
      description: 'Croissants, éclairs, and macarons from the masters of French pastry',
      icon: 'restaurant',
      tags: ['Pastry', 'Gourmet'],
      stops: 5,
      prompt:
        'Plan a pastry-focused day visiting the best pâtisseries in Paris. Start with a morning croissant at Du Pain et des ' +
        'Idées near Canal Saint-Martin (one of the best bakeries in Paris). Visit Cédric Grolet\'s boutique for sculpted ' +
        'fruit pastries. Try the éclairs at L\'Éclair de Génie in the Marais. Get macarons from Pierre Hermé on Rue Bonaparte. ' +
        'End with a tarte tatin or mille-feuille at a classic salon de thé like Angelina on Rue de Rivoli. Include 5 stops ' +
        'across different arrondissements. Each should be a destination pâtisserie. Atmosphere: indulgent, artisanal, sweet.',
    },
    {
      slug: 'montmartre-bohemian',
      title: 'Bohemian Montmartre',
      description: 'Artists, vineyards, and village charm on the hilltop above Paris',
      icon: 'palette',
      tags: ['Art', 'Historic'],
      stops: 4,
      prompt:
        'Plan a day in Montmartre exploring its bohemian artistic heritage. Start at the Sacré-Cœur for panoramic views ' +
        'of Paris. Walk through Place du Tertre where artists still paint portraits. Visit the Musée de Montmartre (Renoir\'s ' +
        'former studio). Discover the vineyard of Montmartre (Clos Montmartre). Have lunch at a classic bistro like Le Consulat ' +
        'or La Maison Rose (pink house). Walk the quiet backstreets — Rue Lepic, Rue de l\'Abreuvoir. End with wine at a cave ' +
        'in Abbesses. Include 4 stops mixing art, history, food, and village atmosphere. Avoid the tourist traps. ' +
        'Atmosphere: artistic, village-like, timeless.',
    },
  ],
};

/**
 * Get all collection metadata for a city (without the full prompts).
 */
export function getCollectionMetas(citySlug: string): CollectionMeta[] | undefined {
  const cityCollections = collections[citySlug.toLowerCase()];
  if (!cityCollections) {
    return undefined;
  }

  return cityCollections.map(({ slug, title, description, icon, tags, stops }) => ({
    slug,
    title,
    description,
    icon,
    tags,
    stops,
  }));
}

/**
 * Get a specific collection definition (including prompt) by city and slug.
 */
export function getCollectionDefinition(
  citySlug: string,
  collectionSlug: string,
): CollectionDefinition | undefined {
  const cityCollections = collections[citySlug.toLowerCase()];
  if (!cityCollections) {
    return undefined;
  }

  return cityCollections.find((c) => c.slug === collectionSlug);
}

/**
 * Get all city slugs that have collections defined.
 */
export function getCitiesWithCollections(): string[] {
  return Object.keys(collections);
}
