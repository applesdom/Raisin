function NoAccelerator(p0, p1) {
  this.list = primitive_list;

  this.getCollision = function(pos, dir) {
    let col = null;
    for(const primitive of primitive_list) {
      let cur_col = primitive.getCollision(pos, dir);
      if(cur_col != null && (col == null || cur_col.sqrdis < col.sqrdis)) {
        col = cur_col;
      }
    }
    return col;
  }

  this.getOcclusion = function(pos, dir, max_sqrdis) {
    let shadow = 1.0;
    for(const primitive of primitive_list) {
      shadow *= primitive.getOcclusion(pos, dir, max_sqrdis);
      if(shadow == 0) {
        break;
      }
    }
    return shadow;
  }
}

function Node(box = null, child_list = []) {
  this.box = box;
  this.child_list = child_list;
}

function BoundingBoxAccelerator(primitive_list) {
  this.node_list = [];
  primitive_loop:
  for(const primitive of primitive_list) {
    let box = primitive.createBoundingBox();
    for(const node of this.node_list) {
      if(node.box.equals(box)) {
        node.child_list.push(primitive);
        continue primitive_loop;
      }
    }
    this.node_list.push(new Node(box, [primitive]));
  }

  this.getCollision = function(pos, dir) {
    let inverse_dir = dir.unit();
    inverse_dir.x = 1.0 / inverse_dir.x;
    inverse_dir.y = 1.0 / inverse_dir.y;
    inverse_dir.z = 1.0 / inverse_dir.z;
    let col = null;
    for(const node of this.node_list) {
      if(node.box.fastCheckCollision(pos, inverse_dir)) {
        for(const primitive of node.child_list) {
          let cur_col = primitive.getCollision(pos, dir);
          if(cur_col != null && (col == null || cur_col.sqrdis < col.sqrdis)) {
            col = cur_col;
          }
        }
      }
    }
    return col;
  }

  this.getOcclusion = function(pos, dir, max_sqrdis) {
    let inverse_dir = dir.unit();
    inverse_dir.x = 1.0 / inverse_dir.x;
    inverse_dir.y = 1.0 / inverse_dir.y;
    inverse_dir.z = 1.0 / inverse_dir.z;
    let shadow = 1.0;
    for(const node of this.node_list) {
      if(node.box.fastCheckCollision(pos, inverse_dir, max_sqrdis)) {
        for(const primitive of node.child_list) {
          shadow *= primitive.getOcclusion(pos, dir, max_sqrdis);
          if(shadow == 0) {
            return shadow;
          }
        }
      }
    }
    return shadow;
  }
}

let balanced_split = function(node) {
  // Find bounding box of centroids of all children
  let centroid_bb = new BoundingBox(node.child_list[0].box.centroid(), node.child_list[0].box.centroid());
  for(const child of node.child_list) {
    centroid_bb.expand(child.box.centroid());
  }

  // Sort children based on x, y, or z coords of centroid (whichever has greatest range)
  let span = centroid_bb.p1.sub(centroid_bb.p0);
  let getDimension;
  switch(Math.max(Math.max(span.x, span.y), span.z)) {
  case span.x:
    getDimension = function(p) {
      return p.x;
    };
    break;
  case span.y:
    getDimension = function(p) {
      return p.y;
    };
    break;
  case span.z:
    getDimension = function(p) {
      return p.z;
    };
    break;
  }
  node.child_list.sort(function(firstEl, secondEl) {
    return getDimension(firstEl.box.centroid()) - getDimension(secondEl.box.centroid());
  });

  // Split neatly in twain
  let n1 = new Node(null, []);
  let n2 = new Node(null, []);
  for(let i = 0; i < node.child_list.length; i ++) {
    let child = node.child_list[i];
    if(i < node.child_list.length / 2) {
      if(n1.box === null) {
        n1.box = child.box;
      } else {
        n1.box = n1.box.union(child.box);
      }
      n1.child_list.push(child);
    } else {
      if(n2.box === null) {
        n2.box = child.box;
      } else {
        n2.box = n2.box.union(child.box);
      }
      n2.child_list.push(child);
    }
  }
  node.child_list.length = 0;
  if(1 < n1.child_list.length) {
    node.child_list.push(n1);
  } else {
    node.child_list.push(n1.child_list[0]);
  }
  if(1 < n2.child_list.length) {
    node.child_list.push(n2);
  } else {
    node.child_list.push(n2.child_list[0]);
  }
}

let spatial_split = function(node) {
  // Find bounding box of centroids of all children
  let centroid_bb = new BoundingBox(node.child_list[0].box.centroid(), node.child_list[0].box.centroid());
  for(const child of node.child_list) {
    centroid_bb.expand(child.box.centroid());
  }

  // Sort children based on x, y, or z coords of centroid (whichever has greatest range)
  let span = centroid_bb.p1.sub(centroid_bb.p0);
  let getDimension;
  switch(Math.max(Math.max(span.x, span.y), span.z)) {
  case span.x:
    getDimension = function(p) {
      return p.x;
    };
    break;
  case span.y:
    getDimension = function(p) {
      return p.y;
    };
    break;
  case span.z:
    getDimension = function(p) {
      return p.z;
    };
    break;
  }
  node.child_list.sort(function(firstEl, secondEl) {
    return getDimension(firstEl.box.centroid()) - getDimension(secondEl.box.centroid());
  });

  // Find midpoint
  let midpoint = getDimension(centroid_bb.p0) + 0.5*getDimension(span);

  // Split neatly around midpoint
  let n1 = new Node(null, []);
  let n2 = new Node(null, []);
  for(const child of node.child_list) {
    if(getDimension(child.box.centroid()) < midpoint) {
      if(n1.box === null) {
        n1.box = child.box;
      } else {
        n1.box = n1.box.union(child.box);
      }
      n1.child_list.push(child);
    } else {
      if(n2.box === null) {
        n2.box = child.box;
      } else {
        n2.box = n2.box.union(child.box);
      }
      n2.child_list.push(child);
    }
  }
  node.child_list.length = 0;
  if(1 < n1.child_list.length) {
    node.child_list.push(n1);
  } else {
    node.child_list.push(n1.child_list[0]);
  }
  if(1 < n2.child_list.length) {
    node.child_list.push(n2);
  } else {
    node.child_list.push(n2.child_list[0]);
  }
}

let SAH_split = function(node) {
  // Find bounding box of centroids of all children
  let centroid_bb = new BoundingBox(node.child_list[0].box.centroid(), node.child_list[0].box.centroid());
  for(const child of node.child_list) {
    centroid_bb.expand(child.box.centroid());
  }

  // Sort children based on x, y, or z coords of centroid (whichever has greatest range)
  let span = centroid_bb.p1.sub(centroid_bb.p0);
  let getDimension;
  switch(Math.max(Math.max(span.x, span.y), span.z)) {
  case span.x:
    getDimension = function(p) {
      return p.x;
    };
    break;
  case span.y:
    getDimension = function(p) {
      return p.y;
    };
    break;
  case span.z:
    getDimension = function(p) {
      return p.z;
    };
    break;
  }
  node.child_list.sort(function(firstEl, secondEl) {
    return getDimension(firstEl.box.centroid()) - getDimension(secondEl.box.centroid());
  });

  // Create 12 buckets for children
  let bucket_list = [];
  for(let i = 0; i < 12; i ++) {
    bucket_list.push(new Node(null, []));
  }
  for(const child of node.child_list) {
    let i = Math.floor((11.999*(getDimension(child.box.centroid()) - getDimension(centroid_bb.p0)) / getDimension(span)));     
    bucket_list[i].child_list.push(child);
    if(bucket_list[i].child_list.length === 1) {
      bucket_list[i].box = new BoundingBox(Object.assign(new Vector(), child.box.p0),
                                           Object.assign(new Vector(), child.box.p1));
    } else {
      bucket_list[i].box.expand(child.box.p0);
      bucket_list[i].box.expand(child.box.p1);
    }
  }

  // Test each bucket as split location, use SAH to find best
  let min_sa = Number.POSITIVE_INFINITY, min_i = -1;
  for(let i = 0; i < 11; i ++) {
    if(bucket_list[i].box === null) {
      continue;
    }
    // Test bucket i
    let bb1 = null, bb2 = null;
    for(let j = 0; j < 12; j ++) {
      if(bucket_list[j].box === null) {
        continue;
      }
      if(j <= i) {
        if(bb1 === null) {
          bb1 = bucket_list[j].box;
        } else {
          bb1 = bb1.union(bucket_list[j].box);
        }
      } else {
        if(bb2 === null) {
          bb2 = bucket_list[j].box;
        } else {
          bb2 = bb2.union(bucket_list[j].box);
        }
      }
    }
    let sa = bb1.surface_area() + bb2.surface_area();
    if(sa < min_sa) {
      min_sa = sa;
      min_i = i;
    }
  }

  // Split at best location
  let n1 = new Node(null, []);
  let n2 = new Node(null, []);
  for(let i = 0; i < 12; i ++) {
    if(bucket_list[i].box === null) {
      continue;
    }
    if(i <= min_i) {
      if(n1.box === null) {
        n1.box = bucket_list[i].box;
      } else {
        n1.box = n1.box.union(bucket_list[i].box);
      }
      for(let child of bucket_list[i].child_list) {
        n1.child_list.push(child);
      }
    } else {
      if(n2.box === null) {
        n2.box = bucket_list[i].box;
      } else {
        n2.box = n2.box.union(bucket_list[i].box);
      }
      for(let child of bucket_list[i].child_list) {
        n2.child_list.push(child);
      }
    }
  }
  node.child_list.length = 0;
  if(1 < n1.child_list.length) {
    node.child_list.push(n1);
  } else {
    node.child_list.push(n1.child_list[0]);
  }
  if(1 < n2.child_list.length) {
    node.child_list.push(n2);
  } else {
    node.child_list.push(n2.child_list[0]);
  }
}

function BVHAccelerator(primitive_list, split_type) {
  this.root = new Node();
  primitive_loop:
  for(const primitive of primitive_list) {
    let box = primitive.createBoundingBox();
    node_loop:
    for(const node of this.root.child_list) {
      if(node.box.equals(box)) {
        node.child_list.push(primitive);
        continue primitive_loop;
      }
    }
    if(this.root.box != null) {
      this.root.box.expand(box.p0);
      this.root.box.expand(box.p1);
    } else {
      this.root.box = new BoundingBox(Object.assign(new Vector(), box.p0),
                                      Object.assign(new Vector(), box.p1));
    }
    this.root.child_list.push(new Node(box, [primitive]));
  }
  let split_function;
  switch(split_type) {
  case 'sah':
    split_function = SAH_split;
    break;
  case 'balance':
    split_function = balanced_split;
    break;
  case 'spatial':
    split_function = spatial_split;
    break;
  }
  let todo = [this.root];
  while(0 < todo.length) {
    let cur = todo.pop();
    if(cur.child_list !== undefined && cur.child_list[0].child_list !== undefined && cur.child_list.length > 2) {
      split_function(cur);
      for(const child of cur.child_list) {
        todo.push(child);
      }
    }
  }

  this.getCollision = function(pos, dir) {
    let inverse_dir = dir.unit();
    inverse_dir.x = 1.0 / inverse_dir.x;
    inverse_dir.y = 1.0 / inverse_dir.y;
    inverse_dir.z = 1.0 / inverse_dir.z;
    let col = null;
    let todo = [this.root];
    while(0 < todo.length) {
      let cur = todo.pop();
      if(cur.child_list !== undefined) {
        if(cur.box.fastCheckCollision(pos, inverse_dir)) {
          for(const child of cur.child_list) {
            todo.push(child);
          }
        }
      } else {
        let cur_col = cur.getCollision(pos, dir);
        if(cur_col != null && (col == null || cur_col.sqrdis < col.sqrdis)) {
          col = cur_col;
        }
      }
    }
    return col;
  }

  this.getOcclusion = function(pos, dir, max_sqrdis) {
    let inverse_dir = dir.unit();
    inverse_dir.x = 1.0 / inverse_dir.x;
    inverse_dir.y = 1.0 / inverse_dir.y;
    inverse_dir.z = 1.0 / inverse_dir.z;
    let shadow = 1.0;
    let todo = [this.root];
    while(0 < todo.length) {
      let cur = todo.pop();
      if(cur.child_list !== undefined) {
        if(cur.box.fastCheckCollision(pos, inverse_dir)) {
          for(const child of cur.child_list) {
            todo.push(child);
          }
        }
      } else {
        shadow *= cur.getOcclusion(pos, dir, max_sqrdis);
        if(shadow == 0) {
          return shadow;
        }
      }
    }
    return shadow;
  }
}
