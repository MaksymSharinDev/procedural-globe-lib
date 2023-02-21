import TriangleMesh from "@redblobgames/dual-mesh";

/**
 * @class QuadGeometry
 * @classdesc A class for storing the geometry of a quad mesh.
 * @property {Int32Array} I - The indices for the mesh.
 * @property {Float32Array} xyz - The xyz coordinates of the mesh.
 * @property {Float32Array} tm - The temperature and moisture of the mesh.
 */
export class QuadGeometry {

    I: Int32Array;
    xyz: Float32Array;
    tm: Float32Array;

    /**
     * @param {TriangleMesh} mesh - The mesh to store the geometry of.
     * @param {number} mesh.numSides - The number of sides in the mesh.
     * @param {number} mesh.numRegions - The number of regions in the mesh.
     * @param {number} mesh.numTriangles - The number of triangles in the mesh.
     */
    setMesh({ numSides, numRegions, numTriangles }: TriangleMesh): void {
        this.I = new Int32Array(3 * numSides);
        this.xyz = new Float32Array(3 * (numRegions + numTriangles));
        this.tm = new Float32Array(2 * (numRegions + numTriangles));
    }

    /**
     * @param {Object} mesh - The mesh to store the geometry of.
     * @param {Object} map - The map to store the geometry of.
     * @param {Float32Array} map.r_xyz - The xyz coordinates of the regions.
     * @param {Float32Array} map.t_xyz - The xyz coordinates of the triangles.
     * @param {Function} map.r_color_fn - The color function for the regions.
     * @param {Float32Array} map.s_flow - The flow of the sides.
     * @param {Float32Array} map.r_elevation - The elevation of the regions.
     * @param {Float32Array} map.t_elevation - The elevation of the triangles.
     * @param {Float32Array} map.r_moisture - The moisture of the regions.
     * @param {Float32Array} map.t_moisture - The moisture of the triangles.
        */
    setMap(
        mesh: TriangleMesh,
        {
            r_xyz, t_xyz,
            r_color_fn,
            s_flow,
            r_elevation, t_elevation,
            r_moisture, t_moisture
        }: any
    ) {
        const V = 0.95;
        const { numSides, numRegions, numTriangles } = mesh;
        const { xyz, tm, I } = this;

        xyz.set(r_xyz);
        xyz.set(t_xyz, r_xyz.length);
        // TODO: multiply all the r, t points by the elevation, taking V into account

        let p = 0;
        for (let r = 0; r < numRegions; r++) {
            tm[p++] = r_elevation[r];
            tm[p++] = r_moisture[r];
        }
        for (let t = 0; t < numTriangles; t++) {
            tm[p++] = t_elevation[t];
            tm[p++] = t_moisture[t];
        }

        let i = 0, count_valley = 0, count_ridge = 0;
        let { _halfedges, _triangles } = mesh;
        for (let s = 0; s < numSides; s++) {
            let opposite_s = mesh.s_opposite_s(s),
                r1 = mesh.s_begin_r(s),
                r2 = mesh.s_begin_r(opposite_s),
                t1 = mesh.s_inner_t(s),
                t2 = mesh.s_inner_t(opposite_s);

            // Each quadrilateral is turned into two triangles, so each
            // half-edge gets turned into one. There are two ways to fold
            // a quadrilateral. This is usually a nuisance but in this
            // case it's a feature. See the explanation here
            // https://www.redblobgames.com/x/1725-procedural-elevation/#rendering
            let coast = r_elevation[r1] < 0.0 || r_elevation[r2] < 0.0;
            if (coast || s_flow[s] > 0 || s_flow[opposite_s] > 0) {
                // It's a coastal or river edge, forming a valley
                I[i++] = r1; I[i++] = numRegions + t2; I[i++] = numRegions + t1;
                count_valley++;
            } else {
                // It's a ridge
                I[i++] = r1; I[i++] = r2; I[i++] = numRegions + t1;
                count_ridge++;
            }
        }

        console.log('ridge=', count_ridge, ', valley=', count_valley);
    }
}