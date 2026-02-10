/**
 * Sewers Level (underground waterways)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '}' });

    des.level_flags('mazelevel');

    // Sewer tunnels with flowing water
    des.map({
        map: `
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}------}}}}}}}}}}}}}}}}}}}------}}}}}}}}}}}}}}}}}}}------}}}}}}}}}}}}}}}
}}}|......|}}}}}}}}}}}}}}}}|......|}}}}}}}}}}}}}}}}|......|}}}}}}}}}}}}}}}
}}}|......|}}}------}}}}}}}|......|}}}------}}}}}}}|......|}}}------}}}}}}
}}}|......|}}}|....|}}}}....|.....|}}.|....|}}}}....|.....|}}.|....|}}}}}
}}}|......|}}}|....|..........|...|}}.|....|..........|...|}}.|....|}}}}}
}}}|......|}}}|....|..........|...|}}.|....|..........|...|}}.|....|}}}}}
}}}|......|}}}|....|}}}}....|.....|}}.|....|}}}}....|.....|}}.|....|}}}}}
}}}|......|}}}------}}}}}}}|......|}}}------}}}}}}}|......|}}}------}}}}}}
}}}|......|}}}}}}}}}}}}}}}}|......|}}}}}}}}}}}}}}}}|......|}}}}}}}}}}}}}}}
}}}}------}}}}}}}}}}}}}}}}}}}------}}}}}}}}}}}}}}}}}}}------}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`
    });

    // Dark and damp
    des.region(selection.area(0, 0, 77, 14), 'unlit');

    // Stairs
    des.stair('up', 10, 6);
    des.stair('down', 65, 6);

    // Objects
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Sewer creatures
    des.monster({ id: 'green slime' });
    des.monster({ id: 'brown pudding' });
    des.monster({ id: 'black pudding' });
    des.monster({ id: 'gray ooze' });
    des.monster({ id: 'ochre jelly' });
    des.monster({ id: 'spotted jelly' });
    des.monster({ id: 'gelatinous cube' });
    des.monster({ id: 'crocodile' });
    des.monster({ id: 'giant eel' });
    des.monster({ id: 'sewer rat' });
    des.monster({ id: 'sewer rat' });
    des.monster({ id: 'sewer rat' });
    des.monster({ id: 'giant rat' });
    des.monster({ id: 'giant rat' });
    des.monster({ id: 'rabid rat' });

    // Random monsters
    for (let i = 0; i < 13; i++) {
        des.monster();
    }

    return finalize_level();
}
