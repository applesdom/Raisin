// A basic 3d vector object

function Vector(x, y, z) {
	this.x = x;
	this.y = y;
  this.z = z;

  this.add = function(v) {
    return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  this.sub = function(v) {
    return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  this.mul = function(s) {
    return new Vector(this.x * s, this.y * s, this.z * s);
  }

  this.mulv = function(v) {
    return new Vector(this.x * v.x, this.y * v.y, this.z * v.z);
  }

  this.mulm = function(v1, v2, v3) {
    return new Vector(this.x * v1.x + this.y * v2.x + this.z * v3.x,
                      this.x * v1.y + this.y * v2.y + this.z * v3.y,
                      this.x * v1.z + this.y * v2.z + this.z * v3.z);
  }

  this.div = function(s) {
    return new Vector(this.x / s, this.y / s, this.z / s);
  }

  this.sqrmag = function() {
    return this.x*this.x + this.y*this.y + this.z*this.z;
  }
  
  this.mag = function() {
    return Math.sqrt(this.sqrmag());
  }

  this.unit = function() {
    return this.div(this.mag())
  }

  this.scale = function(s) {
    let s2 = s / this.mag();
    return this.mul(s2);
  }

  this.dot = function(v) {
    return this.x*v.x + this.y*v.y + this.z*v.z;
  }

  this.cross = function(v) {
    return new Vector((this.y * v.z) - (this.z * v.y), 
                      (this.z * v.x) - (this.x * v.z),
                      (this.x * v.y) - (this.y * v.x));
  }

  this.equals = function(v) {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }
}
