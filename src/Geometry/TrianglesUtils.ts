/* Calculate the centroid and push it onto an array */
export function pushCentroidOfTriangle(out, ax, ay, az, bx, by, bz, cx, cy, cz) {
    // TODO: renormalize to radius 1
    out.push((ax+bx+cx)/3, (ay+by+cy)/3, (az+bz+cz)/3);
}

export function generateTriangleCenters(mesh, {r_xyz}) {
    let {numTriangles} = mesh;
    let t_xyz = [];
    for (let t = 0; t < numTriangles; t++) {
        let a = mesh.s_begin_r(3*t),
            b = mesh.s_begin_r(3*t+1),
            c = mesh.s_begin_r(3*t+2);
        pushCentroidOfTriangle(t_xyz,
                 r_xyz[3*a], r_xyz[3*a+1], r_xyz[3*a+2],
                 r_xyz[3*b], r_xyz[3*b+1], r_xyz[3*b+2],
                 r_xyz[3*c], r_xyz[3*c+1], r_xyz[3*c+2]);
    }
    return t_xyz;
}