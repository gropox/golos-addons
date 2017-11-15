class Asset {
    constructor(asset) {
        this.precision = 0;
        this.amount = 0;
        this.symbol = "";
        this.fromString(asset);
    }

    fromString(asset) {
        if(!asset || !asset.match(/^[0-9.-]+ [A-Z].+[A-Z]$/)) {
            throw "Wrong asset string [" + asset + "]";
        }
        let a = asset.split(" ")[0];
        this.amount = parseFloat(a);
        this.symbol = asset.split(" ")[1];
        //get precition
        let parts = a.split(".");
        if(parts.length > 1) {
            this.precision = parts[1].length;
        } else {
            this.precision = 0;
        }
    }

    toString() {
        return this.amount.toFixed(this.precision) + " " + this.symbol;
    }

    lt(other) {
        other = this.cast(other);
        this.assertSameAsset(other);
        return this.amount < other.amount;
    }

    gt(other) {
        other = this.cast(other);
        this.assertSameAsset(other);
        return this.amount > other.amount;
    }

    equal(other) {
        other = this.cast(other);
        this.assertSameAsset(other);
        return this.amount == other.amount;
    }

    lte(other) {
        return this.lt(other) || this.equal(other);
    }
    
    gte(other) {
        return this.gt(other) || this.equal(other);
    }

    cast(other) {
        if(typeof other === 'string' || other instanceof String) {
            return new Asset(other);
        }
        return other;
    }

    assertSameAsset(other) {
        if(this.symbol != other.symbol) {
            throw "Different assets [" + this.toString() + "] [" + other.toString() + "]";
        }
    }
}

module.exports.Asset = Asset;

module.exports.ZERO_GESTS = "0.000000 GESTS";
module.exports.ZERO_GBG = "0.000 GBG";
module.exports.ZERO_GOLOS = "0.000 GOLOS";

module.exports.lt = function(a1, a2) {
    let as1 = new Asset(a1);
    let as2 = new Asset(a2);
    return as1.lt(as2);
}

module.exports.gt = function(a1, a2) {
    let as1 = new Asset(a1);
    let as2 = new Asset(a2);
    return as1.gt(as2);
}

module.exports.equal = function(a1, a2) {
    let as1 = new Asset(a1);
    let as2 = new Asset(a2);
    return as1.equal(as2);
}

module.exports.minus = function(a1, a2) {
    let as1 = new Asset(a1);
    let as2 = new Asset(a2);
    as1.amount -= as2.amount;
    if (as1.precision > as2.precision) {
        as2.precision = as1.precision;
    } else {
        as1.precision = as2.precision;
    }    
    return as1.toString();
}

module.exports.plus = function(a1, a2) {
    if(!a2) {
        return;
    }
    let as1 = new Asset(a1);
    let as2 = new Asset(a2);
    as1.amount += as2.amount;
    if (as1.precision > as2.precision) {
        as2.precision = as1.precision;
    } else {
        as1.precision = as2.precision;
    }    
    return as1.toString();
}

function assertTrue(cond, msg) {
    if(!cond) {
        console.error("Condition assertion failed", msg);
    }
}

module.exports.test = function() {
    var r1 = new Asset("12.002 ROPOX");
    var r2 = new Asset("33.002 ROPOX");
    var r3 = new Asset("1.000 GBG");
    var r4 = new Asset("4.000 ROPOX");
    var r5 = new Asset("12.002 ROPOX");

    assertTrue(r1.lt(r2), "r1.lt(r2)");
    assertTrue(!r1.lt(r4), "!r1.lt(r4)");
    assertTrue(r1.lte(r5), "r1.lte(r5)");
    assertTrue(r1.equal(r5), "r1.equal(r5)");
    assertTrue(r2.gt(r1), "r2.gt(r1)");
    assertTrue(r2.gt("3.000 ROPOX"), "r2.gt(\"3.000 ROPOX\")");

    try {
        assertTrue(r1.lt(r3), "r1.lt(r3)");
        console.error("Assert assertion failed!");
    } catch(e) {
        console.log(e);
    }

    try {
        assertTrue(r2.gt("3.000 ROP"), "r2.gt(\"3.000 ROP\")");
        console.error("Assert assertion failed!");
    } catch(e) {
        console.log(e);
    }

    r1.amount -= r4.amount;
    console.log(r1.toString());

    console.log(module.exports.minus("123.000 ROPOX", "99.991 ROPOX"));
    console.log(module.exports.minus("81684862.443173 GESTS", "72841822.213742 GESTS"));
    console.log(module.exports.plus("123.000 ROPOX", "99.991 ROPOX"));
    console.log(module.exports.plus("123.000 ROPOX", "32 ROPOX"));
}