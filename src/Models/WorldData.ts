// the variable prefix "t_" means "triangle"
// the variable prefix "r_" means "region"
// the variable prefix "s_" means "side"


import TriangleMesh from "@redblobgames/dual-mesh";

export class WorldData {
    constructor(parameters: Partial<WorldData>) {
        // for each property in the parameters object
        // set the property of this object to the value of the property in the parameters object
        for (let property in parameters) {
            this[property] = parameters[property];
        }
    }

}