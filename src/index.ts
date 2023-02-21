import { SphereMesh } from "./Models/SphereMesh.js";
import { makeRandFloat } from "@redblobgames/prng";
import { QuadGeometry } from "./Geometry/QuadGeometry";
import { generateTriangleCenters } from "./Geometry/TrianglesUtils";
import { WorldData } from "./Models/WorldData";
const getWorldGraphGenerator = function* (
    tesselationResolution: number,
    jitter: number,
    SEED: number,
    shouldBeQuad: boolean
) {

    const makeSphere =
    SphereMesh.makeSphere(
        tesselationResolution,
        jitter,
        makeRandFloat(SEED)
    );
    yield makeSphere.next().value;
}

function generateMesh(
    tesselationResolution: number,
    jitter: number,
    SEED: number,
) {

    // return { mesh, r_xyz };
    // TODO: eventually, simulate a game of Slay to draw country borders
}

// function generateMap() {

//     const map = new WorldData()

//     map = {...map, ...generatePlates(map.mesh, map.r_xyz)}

//     let result = generatePlates(map.mesh, map.r_xyz);
//     map.plate_r = result.plate_r;
//     map.r_plate = result.r_plate;
//     map.plate_vec = result.plate_vec;


//     map.plate_is_ocean = new Set();
//     for (let r of map.plate_r) {
//         if (makeRandInt(r)(10) < 5) {
//             map.plate_is_ocean.add(r);
//             // TODO: either make tiny plates non-ocean, or make sure tiny plates don't create seeds for rivers
//         }
//     }
//     assignRegionElevation(mesh, map);
//     // TODO: assign region moisture in a better way!
//     // I'll be adding in a version of this method: https://nickmcd.me/2018/07/10/procedural-weather-patterns/
//     // Combined with a simple prevailing winds model and major currents model
//     for (let r = 0; r < mesh.numRegions; r++) {
//         map.r_moisture[r] = (map.r_plate[r] % 10) / 10.0;
//     }
//     assignTriangleValues(mesh, map);
//     assignDownflow(mesh, map);
//     assignFlow(mesh, map);

//     assignRegionClouds(mesh, map);
//     assignRegionTemperature(mesh, map);
//     assignRegionHumidity(mesh, map);
//     assignRegionWindVectors(mesh, map);

//     quadGeometry.setMap(mesh, map);
//     draw();
// }



export { getWorldGraphGenerator } 