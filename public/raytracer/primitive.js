function Material() {
  this.rgb = null;
  this.ka = 0.0;
  this.kd = 0.0;
  this.ks = 0.0;
  this.n = 0;
  this.opacity = 0.0;
  this.ir = 0.0;
}

function Collision() {
  this.sqrdis = 0.0;
  this.pos = null;
  this.normal = null;
  this.mtl = null;
  this.internal = false;
}

function Sphere(pos, radius, mtl) {
  this.pos = pos;
  this.radius = radius;
  this.mtl = mtl;

  this.getCollision = function(pos, dir) {
    let col = new Collision();
    let dis = pos.sub(this.pos);
    let ddd = dis.dot(dir);
    let radicand = ddd*ddd - dir.sqrmag()*(dis.sqrmag() - this.radius*this.radius);
    let s = 0;
    if(dis.sqrmag() < this.radius*this.radius) {
      // Internal collision
      s = (Math.sqrt(radicand) - ddd) / dir.sqrmag();
      col.internal = true;
    } else if(0 <= radicand && ddd < 0) {
      // External collision
      s = (-ddd - Math.sqrt(radicand)) / dir.sqrmag();
      col.internal = false;
    } else {
      // No collision
      col.sqrdis = -1;
      return null;
    }
    col.pos = pos.add(dir.mul(s));
    col.sqrdis = (col.pos.sub(pos)).sqrmag();
    col.normal = (col.pos.sub(this.pos)).unit();
    if(col.internal) {
      col.normal = col.normal.mul(-1);
    }
    col.mtl = this.mtl;
    return col;
  }

  this.getOcclusion = function(pos, dir, max_sqrdis) {
    let dis = pos.sub(this.pos);
    let ddd = dis.dot(dir);
    let radicand = ddd*ddd - dir.sqrmag()*(dis.sqrmag() - this.radius*this.radius);
    if(0 <= radicand && ddd < 0 && Math.pow((-ddd - Math.sqrt(radicand)) / dir.sqrmag(), 2) < max_sqrdis) {
      return Math.pow(1 - this.mtl.opacity, 2);
    }
    return 1.0;
  }

  this.createBoundingBox = function() {
    let diagonal = new Vector(this.radius, this.radius, this.radius);
    return new BoundingBox(this.pos.sub(diagonal), this.pos.add(diagonal));
  }
}

function Face(v1, v2, v3, t1, t2, t3, n1, n2, n3, mtl, img) {
  this.pos = v1;
  this.u = v2.sub(v1);
  this.v = v3.sub(v1);
  this.normal = this.u.cross(this.v).unit();
  this.n1 = n1;
  this.n2 = n2;
  this.n3 = n3;
  this.t1 = t1;
  this.t2 = t2;
  this.t3 = t3;
  this.mtl = mtl;
  this.img = img;
  this.matrix = [new Vector(), new Vector, new Vector()];
  let temp_matrix = [[this.u.x, this.v.x, this.normal.x, 1, 0, 0],
                     [this.u.y, this.v.y, this.normal.y, 0, 1, 0],
                     [this.u.z, this.v.z, this.normal.z, 0, 0, 1]];

  if(temp_matrix[0][0] == 0) {
    if(temp_matrix[1][0] == 0) {
      for(let i = 5; i >= 0; i --) {temp_matrix[0][i] += temp_matrix[2][i];}
    } else {
      for(let i = 5; i >= 0; i --) {temp_matrix[0][i] += temp_matrix[1][i];}
    }
  }
	for(let i = 5; i >= 0; i --) {temp_matrix[0][i] /= temp_matrix[0][0];}
	for(let i = 5; i >= 0; i --) {temp_matrix[1][i] += temp_matrix[0][i]*-temp_matrix[1][0];}
	for(let i = 5; i >= 0; i --) {temp_matrix[2][i] += temp_matrix[0][i]*-temp_matrix[2][0];}
	
  if(temp_matrix[1][1] == 0) {
    for(let i = 5; i >= 0; i --) {temp_matrix[1][i] += temp_matrix[2][i];}
  }
	for(let i = 5; i >= 1; i --) {temp_matrix[1][i] /= temp_matrix[1][1];}
	for(let i = 5; i >= 1; i --) {temp_matrix[2][i] += temp_matrix[1][i]*-temp_matrix[2][1];}
	
	for(let i = 5; i >= 2; i --) {temp_matrix[2][i] /= temp_matrix[2][2];}
	
	let temp = temp_matrix[1][2];
	for(let i = 2; i < 6; i ++) {temp_matrix[1][i] += temp_matrix[2][i]*-temp;}
	temp = temp_matrix[0][2];
	for(let i = 0; i < 6; i ++) {temp_matrix[0][i] += temp_matrix[2][i]*-temp;}
	
	temp = temp_matrix[0][1];
	for(let i = 0; i < 6; i ++) {temp_matrix[0][i] += temp_matrix[1][i]*-temp;}

	for(let i = 0; i < 3; i ++) {
    this.matrix[i].x = temp_matrix[0][i + 3];
    this.matrix[i].y = temp_matrix[1][i + 3];
    this.matrix[i].z = temp_matrix[2][i + 3];
	}
  
  let mod = function(a, b) {
    return ((a % b) + b) % b;
  }

  this.getCollision = function(pos, dir) {
    let pos_prime = (pos.sub(this.pos)).mulm(this.matrix[0], this.matrix[1], this.matrix[2]);
    let dir_prime = dir.mulm(this.matrix[0], this.matrix[1], this.matrix[2]);
    let s = -pos_prime.z/dir_prime.z;
    if(s > 0) {
      let p = pos_prime.add(dir_prime.mul(s));
      if(0 <= p.x && 0 <= p.y && p.x + p.y <= 1) {
        let col = new Collision();
        col.pos = this.pos.add(p.mulm(this.u, this.v, this.normal));
        col.sqrdis = (col.pos.sub(pos)).sqrmag();
        if(this.n1 !== null) {
          col.normal = this.n1.mul(1 - p.x - p.y).add(this.n2.mul(p.x)).add(this.n3.mul(p.y)).unit();
        } else {
          col.normal = this.normal;
        }
        col.internal = pos_prime.z < 0;
        if(col.internal) {
          col.normal = col.normal.mul(-1);
        }
        col.mtl = this.mtl
        if(this.img !== null) {
          let t = this.t1.mul(1 - p.x - p.y).add(this.t2.mul(p.x)).add(this.t3.mul(p.y));
          t.x = Math.floor(mod(t.x * this.img.width, this.img.width));
          t.y = Math.floor(mod(t.y * this.img.height, this.img.height));
          col.mtl.rgb = new Vector();
          col.mtl.rgb.x = this.img.data[4*(this.img.width*t.y + t.x)] / 256.0;
          col.mtl.rgb.y = this.img.data[4*(this.img.width*t.y + t.x) + 1] / 256.0;
          col.mtl.rgb.z = this.img.data[4*(this.img.width*t.y + t.x) + 2] / 256.0;
        }
        return col;
      }
    }
    return null;
  }

  this.getOcclusion = function(pos, dir, max_sqrdis) {
    let pos_prime = (pos.sub(this.pos)).mulm(this.matrix[0], this.matrix[1], this.matrix[2]);
    let dir_prime = dir.mulm(this.matrix[0], this.matrix[1], this.matrix[2]);
    let s = -pos_prime.z/dir_prime.z;
    if(s > 0) {
      let p = pos_prime.add(dir_prime.mul(s));
      if(0 <= p.x && 0 <= p.y && p.x + p.y <= 1) {
        let col_pos = this.pos.add(p.mulm(this.u, this.v, this.normal));
        if(col_pos.sub(pos).sqrmag() < max_sqrdis) {
          return Math.pow(1 - this.mtl.opacity, 2);
        }
      }
    }
    return 1.0;
  }

  this.createBoundingBox = function() {
    let p0 = new Vector(this.pos.x, this.pos.y, this.pos.z);
    let p1 = new Vector(this.pos.x, this.pos.y, this.pos.z);
    let temp = this.pos.add(this.u);
    if(temp.x < p0.x) {p0.x = temp.x;}
    else {p1.x = temp.x;}
    if(temp.y < p0.y) {p0.y = temp.y;}
    else {p1.y = temp.y;}
    if(temp.z < p0.z) {p0.z = temp.z;}
    else {p1.z = temp.z;}
    temp = this.pos.add(this.v);
    if(temp.x < p0.x) {p0.x = temp.x;}
    else if(p1.x < temp.x) {p1.x = temp.x;}
    if(temp.y < p0.y) {p0.y = temp.y;}
    else if(p1.y < temp.y) {p1.y = temp.y;}
    if(temp.z < p0.z) {p0.z = temp.z;}
    else if(p1.z < temp.z) {p1.z = temp.z;}
    return new BoundingBox(p0, p1);
  }
}

function BoundingBox(p0, p1) {
  this.p0 = p0;
  this.p1 = p1;

  this.checkCollision = function(pos, dir, max_sqrdis) {
    let inverse_dir = dir.unit();
    inverse_dir.x = 1.0 / inverse_dir.x;
    inverse_dir.y = 1.0 / inverse_dir.y;
    inverse_dir.z = 1.0 / inverse_dir.z;
    return this.fastCheckCollision(pos, inverse_dir, max_sqrdis);
  }

  // Stole this from zacharmarz on Stack Overflow
  this.fastCheckCollision = function(pos, inverse_dir, max_sqrdis) {
    let t1 = (p0.x - pos.x)*inverse_dir.x;
    let t2 = (p1.x - pos.x)*inverse_dir.x;
    let t3 = (p0.y - pos.y)*inverse_dir.y;
    let t4 = (p1.y - pos.y)*inverse_dir.y;
    let t5 = (p0.z - pos.z)*inverse_dir.z;
    let t6 = (p1.z - pos.z)*inverse_dir.z;

    let tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
    let tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

    return (0 <= tmax && tmin <= tmax) && (max_sqrdis === undefined || tmax*tmax < max_sqrdis);
  }

  this.equals = function(bb) {
    return this.p0.equals(bb.p0) && this.p1.equals(bb.p1);
  }

  this.expand = function(p) {
    if(p.x < p0.x) {p0.x = p.x;}
    if(p1.x < p.x) {p1.x = p.x;}
    if(p.y < p0.y) {p0.y = p.y;}
    if(p1.y < p.y) {p1.y = p.y;}
    if(p.z < p0.z) {p0.z = p.z;}
    if(p1.z < p.z) {p1.z = p.z;}
  }

  this.union = function(bb) {
    let ret = new BoundingBox(Object.assign(new Vector(), this.p0), 
                              Object.assign(new Vector(), this.p1));
    ret.expand(bb.p0);
    ret.expand(bb.p1);
    return ret;
  }

  this.centroid = function() {
    return this.p0.add(this.p1).mul(0.5);
  }

  this.surface_area = function() {
    let diag = this.p1.sub(this.p0);
    return 2*diag.x*diag.y + 2*diag.y*diag.z + 2*diag.z*diag.x;
  }
}
