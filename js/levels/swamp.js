/**
 * Swamp Level (muddy wetlands)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '}' });

    des.level_flags('mazelevel');

    // Swampy wetlands with mud and water
    des.map({
        map: `
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}.............}}}}}}}}}}}}}}}}}}}}}}}}}}...............}}}}}
}}}}}}}}}}}...................}}}}}}}}}}}}}}}}}}.......................}}}
}}}}}}}}}.......................}}}}}}}}}}}}}.........................}}}}
}}}}}}}}.........................}}}}}}}}}}...........................}}}}
}}}}}}}..........................-----------...........................}}}
}}}}}}..........................|.........|............................}}}
}}}}}............................|.........|............................}}
}}}}.............................|.........|.............................}
}}}...............................---------...............................}
}}}......................................................................}}
}}}.......................................................................}
}}}}......................................................................}
}}}}......................................................................}
}}}}}....................................................................}}
}}}}}}}.................................................................}}}
}}}}}}}}.............................................................}}}}
}}}}}}}}}}.........................................................}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`
    });

    // Mostly unlit swamp
    des.region(selection.area(0, 0, 75, 19), 'unlit');

    // Lit island in center
    des.region(selection.area(30, 5, 40, 9), 'lit');

    // Stairs
    des.stair('up', 35, 7);
    des.stair('down', 60, 15);

    // Objects
    for (let i = 0; i < 12; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 8; i++) {
        des.trap();
    }

    // Swamp creatures
    des.monster({ id: 'green slime' });
    des.monster({ id: 'black pudding' });
    des.monster({ id: 'crocodile' });
    des.monster({ id: 'crocodile' });
    des.monster({ id: 'giant eel' });
    des.monster({ id: 'electric eel' });
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'ochre jelly' });
    des.monster({ id: 'spotted jelly' });
    des.monster({ id: 'lizard' });
    des.monster({ id: 'newt' });
    des.monster({ id: 'gecko' });
    des.monster({ id: 'garter snake' });
    des.monster({ id: 'water moccasin' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });

    // Random monsters
    for (let i = 0; i < 11; i++) {
        des.monster();
    }

    return finalize_level();
}
