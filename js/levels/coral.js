/**
 * Coral Reef Level (underwater reef)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '}' });

    des.level_flags('mazelevel');

    // Underwater coral reef
    des.map({
        map: `
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}...................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}.............................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}.....................................}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}.........................................}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}...................{{{{{{{.................}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}...................{{{{{{{{{{{...............}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}...................{{{{{{{{{{{...............}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}...................{{{{{{{.................}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}.........................................}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}.....................................}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}.............................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}...................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`
    });

    // Underwater lighting
    des.region(selection.area(0, 0, 77, 14), 'lit');

    // Stairs
    des.stair('up', 15, 7);
    des.stair('down', 62, 7);

    // Objects
    for (let i = 0; i < 12; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 8; i++) {
        des.trap();
    }

    // Marine creatures
    des.monster({ id: 'shark' });
    des.monster({ id: 'shark' });
    des.monster({ id: 'giant eel' });
    des.monster({ id: 'giant eel' });
    des.monster({ id: 'electric eel' });
    des.monster({ id: 'electric eel' });
    des.monster({ id: 'kraken' });
    des.monster({ id: 'jellyfish' });
    des.monster({ id: 'piranha' });
    des.monster({ id: 'piranha' });
    des.monster({ id: 'water elemental' });
    des.monster({ id: 'water nymph' });
    des.monster({ id: 'water nymph' });

    // Random monsters
    for (let i = 0; i < 15; i++) {
        des.monster();
    }

    return finalize_level();
}
