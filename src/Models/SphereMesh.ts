import TriangleMesh from "@redblobgames/dual-mesh";
import Delaunator from "delaunator";

export type FibonacciSphereData = {
    latitude: {
        currentRadius: number,
        spiralRadiusAtAngle: number
        currentRadiansFromNorthPole: number,
        currentCircumference: number
        getRadiansFromNorthPole: number
        validSinValue: number
        latitudeDegreesOffset: number
        evenlyDistributedLatitudeOffset: number
        randomLat: number
        jitterWeightedRandomLatitudeOffset: number
        randomizedLatitudeOffset: number
        finalLatitudeDegrees: number
    },
    longitude: {
        currentRadius: number,
        spiralToRadiusRatio: number
        randomLon: number
        randomizedLongitudeOffset: number
        finalLongitudeDegrees: number
    }
}

export type Coordinates = {
    latitude: number,
    longitude: number
}

export class SphereMesh {

    static *makeSphere(TesselationResolution: number, jitter: number, randFloat: () => number) {

        
        const fibonacciCalculationStream = SphereMesh.generateFibonacciSphere(TesselationResolution, jitter, randFloat)
        const coordinates: { latitude: number, longitude: number }[] = []
        // cycle fibonacciCalculationStream
        // the ending value is ours
        while (true) {
            const { value, done } = fibonacciCalculationStream.next()
            if (done) {
                yield coordinates
                break
            }
            const { latitude, longitude } = value as FibonacciSphereData
            const { finalLatitudeDegrees } = latitude
            const { finalLongitudeDegrees } = longitude
            coordinates.push({
                latitude: finalLatitudeDegrees,
                longitude: finalLongitudeDegrees
            }
            )
        }



        // // Convert lat/long to 3D cartesian coordinates
        // let r_xyz: number[] = [];
        // for (let r = 0; r < latlong.length / 2; r++) {
        //     r_xyz = SphereMesh.pushCartesianFromSpherical(r_xyz, latlong[2 * r], latlong[2 * r + 1]);
        // }

        // // Project the points onto a sphere
        // let delaunay: Delaunator<number[]> = new Delaunator(SphereMesh.stereographicProjection(r_xyz));

        // // TODO: rotate an existing point into this spot instead of creating one from scratch

        // // <--- 
        // // Add a point at the south pole
        // r_xyz.push(0, 0, 1);
        // const { triangles, halfedges } = SphereMesh._addSouthPoleToMesh(r_xyz.length / 3 - 1, delaunay);

        // // Add a dummy vertex to the mesh
        // let dummy_r_vertex = [[0, 0]];
        // for (let i = 1; i < N + 1; i++) {
        //     dummy_r_vertex[i] = dummy_r_vertex[0];
        // }
        // // --->

        // // Create a mesh
        // let mesh = new TriangleMesh({
        //     numBoundaryRegions: 0,
        //     numSolidSides: triangles.length,
        //     _r_vertex: dummy_r_vertex,
        //     _triangles: triangles,
        //     _halfedges: halfedges,
        // });

        // return { mesh, r_xyz };
    }

    private static _addSouthPoleToMesh(southPoleId: number, { triangles, halfedges }: Partial<Delaunator<number[]>>): Partial<Delaunator<number[]>> {
        // FROM @redblobgames: 
        // This logic is from <https://github.com/redblobgames/dual-mesh>,
        // where I use it to insert a "ghost" region on the "back" side of
        // the planar map. The same logic works here. In that code I use
        // "s" for edges ("sides"), "r" for regions ("points"), t for triangles
        let numSides = triangles.length;
        const s_next_s: (s: number) => number = s => (s % 3 == 2) ? s - 2 : s + 1

        let [firstUnpairedSide, numUnpairedSides,] = [-1, 0]
        let pointIdToSideId = []; // seed to side
        for (let s = 0; s < numSides; s++) {
            if (halfedges[s] === -1) {
                numUnpairedSides++;
                pointIdToSideId[triangles[s]] = s;
                firstUnpairedSide = s;
            }
        }

        let newTriangles = new Uint32Array(numSides + 3 * numUnpairedSides);
        let newHalfedges = new Int32Array(numSides + 3 * numUnpairedSides);
        newTriangles.set(triangles);
        newHalfedges.set(halfedges);

        for (let i = 0, s = firstUnpairedSide;
            i < numUnpairedSides;
            i++, s = pointIdToSideId[newTriangles[s_next_s(s)]]) {

            // Construct a pair for the unpaired side s
            let newSide = numSides + 3 * i;
            newHalfedges[s] = newSide;
            newHalfedges[newSide] = s;
            newTriangles[newSide] = newTriangles[s_next_s(s)];

            // Construct a triangle connecting the new side to the south pole
            newTriangles[newSide + 1] = newTriangles[s];
            newTriangles[newSide + 2] = southPoleId;
            let k = numSides + (3 * i + 4) % (3 * numUnpairedSides);
            newHalfedges[newSide + 2] = k;
            newHalfedges[k] = newSide + 2;
        }

        return {
            triangles: newTriangles,
            halfedges: newHalfedges,
        };
    }

    /**
     *     This code is used to distribute points on a sphere using the Fibonacci spiral algorithm 
     *     The algorithm begins by looping through each point in the spiral 
     *     and calculating the latitude and longitude degrees for the point. 
     *     It then adds a random jitter to the latitude and longitude degrees 
     *     using a randomly generated value from the randomLat and randomLon arrays. 
     *     This jitter helps to break up the pattern and add additional randomness.  
     * 
     * algorithm from http://web.archive.org/web/20120421191837/http://www.cgafaq.info/wiki/Evenly_distributed_points_on_sphere
     * @param {number} tesselationResolution number of points
     * @param {number} jitter 
     * @param {Function<number>} randFloat seeded random number generator  
     * @returns {Generator<{longitude: number, latitude: number}>} array of latitudes and longitudes [{longitude, latitude}, ...]
    */
    static *generateFibonacciSphere(tesselationResolution: number, jitter: number, randFloat: () => number):
        IterableIterator<FibonacciSphereData> {

        // coordinates in degrees
        const coordinates: { latitude: number, longitude: number }[] = [];

        // We keep track of the randomized values weighted by the jitter factor
        const [randomLat, randomLon] = [[], []];
        // the spiral constant is used to obtain the radius of the spiral at a given angle  

        const spiralConstant = 3.6 / Math.sqrt(tesselationResolution);
        // the longitude change rate is used to obtain the longitude at a given angle
        const getGoldenAngle = () => Math.PI * (3 - Math.sqrt(5))
        const longitudeChangeRate = getGoldenAngle()   /* ~2.39996323 */
        // radians from north pole change rate is used to decrement by 
        const radiansFromNorthPoleChangeRate = 2.0 / tesselationResolution;

        // iterate over the points
        for (let currentPoint = 0, currentLongitude = 0, currentRadiansFromNorthPole = 1 - radiansFromNorthPoleChangeRate / 2;
            // stop when we reach the tesselation resolution
            currentPoint !== tesselationResolution;
            // increment the point and the z level
            currentPoint++, currentRadiansFromNorthPole -= radiansFromNorthPoleChangeRate) {

            const results: FibonacciSphereData = {
                latitude: {},
                longitude: {}
            } as FibonacciSphereData


            const getDegreesFromRadians = (radians: number) => radians * 180 / Math.PI;
            // calculate the radius of the spiral at the current angle
            const currentRadius = Math.cos(currentRadiansFromNorthPole);
            // calculate the latitude and longitude in degrees
            let latitudeDegrees = getDegreesFromRadians(Math.asin(currentRadiansFromNorthPole))
            if (currentPoint != 0) currentLongitude += longitudeChangeRate;
            let longitudeDegrees = getDegreesFromRadians(currentLongitude);

            // add some jitter to the latitude and longitude
            randomLat[currentPoint] =
                randomLat[currentPoint] ? randomLat[currentPoint] : randFloat() - randFloat();
            randomLon[currentPoint] =
                randomLon[currentPoint] ? randomLon[currentPoint] : randFloat() - randFloat();

            const getSpiralRadiusAtAngle = () => currentRadius / spiralConstant;
            results.latitude.currentRadius = currentRadius;
            results.latitude.spiralRadiusAtAngle = getSpiralRadiusAtAngle();

            const circumferenceFromRadius = (n) => n * 2 * Math.PI;
            const getExtendCircumferenceValueBy = (n) => n * circumferenceFromRadius(getSpiralRadiusAtAngle());
            const getRadiansFromNorthPole = () => currentRadiansFromNorthPole - getExtendCircumferenceValueBy(radiansFromNorthPoleChangeRate)
            results.latitude.currentRadiansFromNorthPole = currentRadiansFromNorthPole;
            results.latitude.currentCircumference = getExtendCircumferenceValueBy(radiansFromNorthPoleChangeRate);
            results.latitude.getRadiansFromNorthPole = getRadiansFromNorthPole();

            const setMaxTo90degrees = (n) => Math.max(-1, n)
            const getValidSinValue = () => setMaxTo90degrees(getRadiansFromNorthPole())
            results.latitude.validSinValue = getValidSinValue();


            const toRadians = (n) => n * 180 / Math.PI;
            const getArcSinAngleDegrees = (n) => toRadians(Math.asin(n))
            const getLatitudeDegreesOffset = () => getArcSinAngleDegrees(getValidSinValue())
            results.latitude.latitudeDegreesOffset = getLatitudeDegreesOffset();


            const getEvenlyDistributedLatitudeOffset = () => latitudeDegrees - getLatitudeDegreesOffset()
            results.latitude.evenlyDistributedLatitudeOffset = getEvenlyDistributedLatitudeOffset();


            const getJitterWeightedRandomLatitudeOffset = () => jitter * randomLat[currentPoint]
            results.latitude.randomLat = randomLat[currentPoint];
            results.latitude.jitterWeightedRandomLatitudeOffset = getJitterWeightedRandomLatitudeOffset();

            const applyRandomizationToLatitudeOffset = () => getJitterWeightedRandomLatitudeOffset() * getEvenlyDistributedLatitudeOffset()
            results.latitude.randomizedLatitudeOffset = applyRandomizationToLatitudeOffset();

            const getLatitudeDegrees = () => latitudeDegrees + applyRandomizationToLatitudeOffset()
            results.latitude.finalLatitudeDegrees = getLatitudeDegrees();

            const getSpiralToRadiusRatio = () => spiralConstant / currentRadius;
            results.longitude.currentRadius = currentRadius;
            results.longitude.spiralToRadiusRatio = getSpiralToRadiusRatio();

            const getJitterWeightedRandomLongitudeOffset = () => jitter * randomLon[currentPoint]
            const applyRandomizationToLongitudeOffset = () => getJitterWeightedRandomLongitudeOffset() * toRadians(getSpiralToRadiusRatio())
            results.longitude.randomLon = randomLon[currentPoint];
            results.longitude.randomizedLongitudeOffset = applyRandomizationToLongitudeOffset();

            const normalizeLongitude = (n) => n % 360
            const wrapLongitudeTo180 = (n) => normalizeLongitude(n) > 180 ? normalizeLongitude(n) - 360 : normalizeLongitude(n)
            const getLongitudeDegrees = () => wrapLongitudeTo180(longitudeDegrees + applyRandomizationToLongitudeOffset())
            results.longitude.finalLongitudeDegrees = getLongitudeDegrees();

            latitudeDegrees = results.latitude.finalLatitudeDegrees;
            longitudeDegrees = results.longitude.finalLongitudeDegrees;

            // push the coordinates to the array
            coordinates.push({
                latitude: latitudeDegrees,
                longitude: longitudeDegrees
            });
            yield results;
        }
    }

    /**
     * Convert latitude and longitude to 3D cartesian coordinates
     * @param  {number} latDeg degrees of latitude
     * @param {number} lonDeg degrees of longitude
     * @param {number[]} out array to push the cartesian coordinates to
     * @returns {number[]} cartesian coordinates
    */
    static pushCartesianFromSpherical(out: number[], latDeg: number, lonDeg: number): number[] {

        // Convert latitude and longitude to radians
        let latRad = latDeg / 180.0 * Math.PI,
            lonRad = lonDeg / 180.0 * Math.PI;
        // Convert radians to cartesian coordinates 
        out.push(Math.cos(latRad) * Math.cos(lonRad),
            Math.cos(latRad) * Math.sin(lonRad),
            Math.sin(latRad));
        return out;
    }
    /**
     * 
     * @param {number[]} r_xyz points on a sphere
     * @returns {number[]} points on a sphere projected onto a plane
     */
    static stereographicProjection(r_xyz: number[]): number[] {
        // See <https://en.wikipedia.org/wiki/Stereographic_projection>
        const degToRad = Math.PI / 180;
        let numPoints = r_xyz.length / 3;
        let r_XY = [];
        for (let r = 0; r < numPoints; r++) {
            let x = r_xyz[3 * r],
                y = r_xyz[3 * r + 1],
                z = r_xyz[3 * r + 2];
            let X = x / (1 - z),
                Y = y / (1 - z);
            r_XY.push(X, Y);
        }
        return r_XY;
    }
}