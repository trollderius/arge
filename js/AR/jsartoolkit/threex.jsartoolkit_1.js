
ASVector = function(elements) {
    elements = elements || 0;
    if (elements.length) {
        this.length = elements.length;
        for (var i = 0; i < elements.length; i++)
            this[i] = elements[i];
    } else {
        this.length = elements;
        for (var i = 0; i < elements; i++)
            this[i] = 0;
    }
};
ASVector.prototype = {};
ASVector.prototype.set = function(idx, val) {
    if (idx.length)
        ASVector.call(this, idx);
    else
        this[idx] = val;
};

if (typeof Float32Array == 'undefined') {
    FloatVector = ASVector;
    IntVector = ASVector;
    UintVector = ASVector;
} else {
    FloatVector = Float32Array;
    IntVector = Int32Array;
    UintVector = Uint32Array;
}

toInt = Math.floor;

Object.extend = function(dst, src) {
    for (var i in src) {
        try {
            dst[i] = src[i];
        } catch (e) {
        }
    }
    return dst;
};

toArray = function(obj) {
    var a = new Array(obj.length);
    for (var i = 0; i < obj.length; i++)
        a[i] = obj[i];
    return a;
};

Klass = (function() {
    var c = function() {
        if (this.initialize) {
            this.initialize.apply(this, arguments);
        }
    };
    c.ancestors = toArray(arguments);
    c.prototype = {};
    for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i];
        if (a.prototype) {
            Object.extend(c.prototype, a.prototype);
        } else {
            Object.extend(c.prototype, a);
        }
    }
    Object.extend(c, c.prototype);
    return c;
});

Object.asCopy = function(obj) {
    if (typeof obj != 'object') {
        return obj;
    } else if (obj instanceof FloatVector) {
        var v = new FloatVector(obj.length);
        for (var i = 0; i < v.length; i++)
            v[i] = obj[i];
        return v;
    } else if (obj instanceof IntVector) {
        var v = new IntVector(obj.length);
        for (var i = 0; i < v.length; i++)
            v[i] = obj[i];
        return v;
    } else if (obj instanceof UintVector) {
        var v = new UintVector(obj.length);
        for (var i = 0; i < v.length; i++)
            v[i] = obj[i];
        return v;
    } else if (obj instanceof Array) {
        return obj.map(Object.asCopy);
    } else {
        var newObj = {};
        for (var i in obj) {
            var v = obj[i];
            if (typeof v == 'object') {
                v = Object.asCopy(v);
            }
            newObj[i] = v;
        }
        return newObj;
    }
};

ASKlass = (function(name) {
    var c = function() {
        var cc = this.__copyObjects__;
        for (var i = 0; i < cc.length; i++)
            this[cc[i]] = Object.asCopy(this[cc[i]])
        if (this.initialize)
            this.initialize.apply(this, arguments);
    }
    c.ancestors = toArray(arguments).slice(1);
    c.prototype = {};
    for (var i = 1; i < arguments.length; i++) {
        var a = arguments[i];
        if (a.prototype) {
            Object.extend(c.prototype, a.prototype);
        } else {
            Object.extend(c.prototype, a);
        }
    }
    c.prototype.className = name;
    c.prototype.initialize = c.prototype[name];
    c.prototype.__copyObjects__ = [];
    for (var i in c.prototype) {
        var v = c.prototype[i];
        if (i != '__copyObjects__') {
            if (typeof v == 'object') {
                c.prototype.__copyObjects__.push(i);
            }
        }
    }
    Object.extend(c, c.prototype);
    return c;
});

// partial implementation of the ActionScript3 BitmapData class
// See: http://www.adobe.com/livedocs/flash/9.0/ActionScriptLangRefV3/flash/display/BitmapData.html
BitmapData = Klass({
    initialize: function(i_width, i_height, transparent, fill) {
        this.width = i_width;
        this.height = i_height;
        this.transparent = (transparent == null ? true : transparent);
        this.fill = (fill == null ? 0xffffffff : fill);
        this.data = new UintVector(i_width * i_height);
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = fill;
        }
        this.rect = new Rectangle(0, 0, this.width, this.height);
    }
    ,
    fillRect: function(rect, value) {
        var stride = this.width;
        var y = Math.clamp(rect.y, 0, this.height) * stride
                , y2 = Math.clamp(rect.y + rect.height, 0, this.height) * stride
                , x = Math.clamp(rect.x, 0, this.width)
                , x2 = Math.clamp(rect.x + rect.width, 0, this.width);
        var d = this.data;
        for (var y1 = y; y1 < y2; y1 += stride)
            for (var x1 = x; x1 < x2; x1++)
                d[y1 + x1] = value;
    }
    ,
    getPixel32: function(x, y) {
        return this.data[y * this.width + x];
    },
    setPixel32: function(x, y, v) {
        return this.data[y * this.width + x] = v;
    },
    getPixel: function(x, y) {
        return this.data[y * this.width + x] & 0x00ffffff;
    },
    setPixel: function(x, y, v) {
        return this.data[y * this.width + x] = v | (this.data[y * this.width + x] & 0xff000000);
    },
    getWidth: function() {
        return this.width;
    },
    getHeight: function() {
        return this.height;
    }
    ,
    copyPixels: function(source, rect, offset) {
        var tstride = this.width;
        var stride = source.width;
        var d = source.data;
        var td = this.data;
        var ty = Math.clamp(offset.y, 0, this.height) * tstride
                , ty2 = Math.clamp(offset.y + rect.height, 0, this.height) * tstride
                , tx = Math.clamp(offset.x, 0, this.width)
                , tx2 = Math.clamp(offset.x + rect.width, 0, this.width);
        var y = Math.clamp(rect.y, 0, source.height) * stride
                , y2 = Math.clamp(rect.y + rect.height, 0, source.height) * stride
                , x = Math.clamp(rect.x, 0, source.width)
                , x2 = Math.clamp(rect.x + rect.width, 0, source.width);
        for (var y1 = y, ty1 = ty; y1 < y2 && ty1 < ty2; y1 += stride, ty1 += tstride)
            for (var x1 = x, tx1 = tx; x1 < x2 && tx1 < tx2; x1++, tx1++)
                td[ty1 + tx1] = d[y1 + x1];
    }
    ,
    getColorBoundsRect: function(mask, color, findColor) {
        if (findColor) {
            return this.getColorBoundsRect_true(mask, color);
        } else {
            return this.getColorBoundsRect_false(mask, color);
        }
    }
    ,
    getColorBoundsRect_true: function(mask, color) {
        var minX = this.width, minY = this.height, maxX = 0, maxY = 0;
        var w = this.width;
        h = this.height;
        var d = this.data;
        var m = 0, off = 0;
        minYfor: for (var y = 0; y < h; y++) {
            off = y * w - 1;
            for (var x = 0; x < w; x++) {
                m = (d[++off] & mask) - color;
                if (!m) {
                    minX = maxX = x;
                    minY = maxY = y;
                    break minYfor;
                }
            }
        }
        maxYfor: for (var y = h - 1; y > minY; y--) {
            off = y * w - 1;
            for (var x = 0; x < w; x++) {
                m = (d[++off] & mask) - color;
                if (!m) {
                    if (x < minX)
                        minX = x;
                    if (x > maxX)
                        maxX = x;
                    maxY = y;
                    break maxYfor;
                }
            }
        }
        for (var y = minY; y <= maxY; y++) {
            off = y * w - 1;
            for (var x = 0; x < minX; x++) {
                m = (d[++off] & mask) - color;
                if (!m) {
                    minX = x;
                    break;
                }
            }
            off = y * w + w;
            for (var x = w - 1; x > maxX; x--) {
                m = (d[--off] & mask) - color;
                if (!m) {
                    maxX = x;
                    break;
                }
            }
        }
        return new Rectangle(minX, minY, Math.max(0, maxX - minX), Math.max(0, maxY - minY));
    }
    ,
    getColorBoundsRect_false: function(mask, color) {
        var minX = this.width, minY = this.height, maxX = 0, maxY = 0;
        var w = this.width;
        h = this.height;
        var d = this.data;
        minYfor: for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var m = (d[y * w + x] & mask) - color;
                if (m) {
                    minX = maxX = x;
                    minY = maxY = y;
                    break minYfor;
                }
            }
        }
        maxYfor: for (var y = h - 1; y > minY; y--) {
            for (var x = 0; x < w; x++) {
                var m = (d[y * w + x] & mask) - color;
                if (m) {
                    if (x < minX)
                        minX = x;
                    if (x > maxX)
                        maxX = x;
                    maxY = y;
                    break maxYfor;
                }
            }
        }
        for (var y = minY; y <= maxY; y++) {
            for (var x = 0; x < minX; x++) {
                var m = (d[y * w + x] & mask) - color;
                if (m) {
                    minX = x;
                    break;
                }
            }
            for (var x = h - 1; x > maxX; x--) {
                var m = (d[y * w + x] & mask) - color;
                if (m) {
                    maxX = x;
                    break;
                }
            }
        }
        return new Rectangle(minX, minY, Math.max(0, maxX - minX), Math.max(0, maxY - minY));
    }
    ,
    putImageData: function(imageData, x, y, w, h) {
        w = Math.clamp(w, 0, imageData.width), h = Math.clamp(h, 0, imageData.height);
        var stride = this.width;
        var d = this.data;
        var td = imageData.data;
        var y = Math.clamp(y, 0, this.height) * stride
                , y2 = Math.clamp(y + h, 0, this.height) * stride
                , x = Math.clamp(x, 0, this.width)
                , x2 = Math.clamp(x + w, 0, this.width);
        for (var y1 = y, ty1 = 0; y1 < y2; y1 += stride, ty1 += imageData.width * 4) {
            for (var x1 = x, tx1 = 0; x1 < x2; x1++, tx1 += 4) {
                d[y1 + x1] = (// transform canvas pixel to 32-bit ARGB int
                        (td[ty1 + tx1] << 16) |
                        (td[ty1 + tx1 + 1] << 8) |
                        (td[ty1 + tx1 + 2]) |
                        (td[ty1 + tx1 + 3] << 24)
                        );
            }
        }
    }
    ,
    drawCanvas: function(canvas, x, y, w, h) {
        this.putImageData(canvas.getContext('2d').getImageData(0, 0, w, h), x, y, w, h);
    }
    ,
    drawOnCanvas: function(canvas) {
        var ctx = canvas.getContext('2d');
        var id = ctx.getImageData(0, 0, this.width, this.height);
        var stride = this.width;
        var length = this.height * stride;
        var d = this.data;
        var td = id.data;
        for (var y = 0; y < length; y += stride) {
            for (var x = 0; x < stride; x++) {
                var base = 4 * (y + x);
                var c = d[y + x];
                td[base] = (c >> 16) & 0xff;
                td[++base] = (c >> 8) & 0xff;
                td[++base] = (c) & 0xff;
                td[++base] = (c >> 24) & 0xff;
            }
        }
        ctx.putImageData(id, 0, 0);
    }
    ,
    floodFill: function(x, y, nv) {
        var l = 0, x1 = 0, x2 = 0, dy = 0;
        var ov = 0; /* old pixel value */
        var stack = [];
        var w = this.width, h = this.height;
        var stride = this.width;
        var data = this.data;

        ov = data[y * stride + x];
        if (ov == nv || x < 0 || x >= w || y < 0 || y >= h)
            return;
        stack.push([y, x, x, 1]);     // needed in some cases
        stack.push([y + 1, x, x, -1]);    // seed segment (popped 1st)

        while (stack.length > 0) {
            // pop segment off stack and fill a neighboring scan line
            var a = stack.pop();
            y = a[0] + a[3], x1 = a[1], x2 = a[2], dy = a[3];

            // segment of scan line y-dy for x1<=x<=x2 was previously filled,
            // now explore adjacent pixels in scan line y
            for (x = x1; x >= 0 && data[y * stride + x] == ov; x--)
                data[y * stride + x] = nv;
            if (x < x1) {
                l = x + 1;
                if (l < x1)
                    stack.push([y, l, x1 - 1, -dy]); // leak on left?
                x = x1 + 1;
                for (; x < w && data[y * stride + x] == ov; x++)
                    data[y * stride + x] = nv;
                stack.push([y, l, x - 1, dy]);
                if (x > x2 + 1)
                    stack.push([y, x2 + 1, x - 1, -dy]); // leak on right?
            }
            for (x++; x <= x2 && data[y * stride + x] != ov; x++)
                null;
            l = x;
            while (x <= x2) {
                for (; x < w && data[y * stride + x] == ov; x++)
                    data[y * stride + x] = nv;
                stack.push([y, l, x - 1, dy]);
                if (x > x2 + 1)
                    stack.push([y, x2 + 1, x - 1, -dy]); // leak on right?
                for (x++; x <= x2 && data[y * stride + x] != ov; x++)
                    null;
                l = x;
            }
        }
    }
});

Rectangle = Klass({
    initialize: function(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.top = y;
        this.left = x;
        this.bottom = y + h;
        this.right = x + w;
        this.width = w;
        this.height = h;
        this.updateCalc();
    },
    updateCalc: function() {
        this.top = this.y;
        this.left = this.x;
        this.bottom = this.y + this.height;
        this.right = this.x + this.width;
    },
    clone: function() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    },
    inflate: function(dx, dy) {
        this.x -= dx;
        this.y -= dy;
        this.width += 2 * dx;
        this.height += 2 * dy;
        this.updateCalc();
    },
    isEmpty: function() {
        return (this.width <= 0 && this.height <= 0)
    }
});

NyARException = Klass(Error, {// The Exception object used by NyARToolkit.
    initialize: function(m) {
        Error.call(this, m);
    },
    trap: function(m) {
        throw new NyARException("trap:" + m);
    },
    notImplement: function() {
        throw new NyARException("Not Implement!");
    }
});

NyAS3Const_Inherited = Klass({
});

NyAS3Utils = Klass({
    assert: function(e, mess) {
        if (!e) {
            throw new Error("NyAS3Utils.assert:" + mess != null ? mess : "");
        }
    }
});

NyARVec = Klass({
    clm: null,
    v: null,
    initialize: function(i_clm)
    {
        this.v = new FloatVector(i_clm);
        this.clm = i_clm;
    },
    getClm: function()
    {
        return this.clm;
    },
    getArray: function()
    {
        return this.v;
    }
});

// Class typedef struct corresponding to ARMat structure {double * m; int row; int clm;} ARMat;
NyARMat = Klass({
    // Matrix size and array size is not to use it as the size of the matrix the size of the array returned note may not always agree!
    m: null,
    __matrixSelfInv_nos: null,
    clm: null,
    row: null,
    initialize: function(i_row, i_clm) {
        this.m = new Array(i_row);
        for (var i = 0; i < i_row; i++) {
            this.m[i] = new FloatVector(i_clm);
            for (var j = 0; j < i_clm; j++)
                this.m[i][j] = 0.0;
        }
        this.__matrixSelfInv_nos = new FloatVector(i_row);
        this.clm = i_clm;
        this.row = i_row;
        return;
    }
    ,
    getClm: function() { // return the number of columns of the matrix
        return this.clm;
    },
    getRow: function() { // return the number of rows of the matrix
        return this.row;
    },
    getArray: function() {
        return this.m;
    }
    ,
    matrixSelfInv: function() { // By calculating the inverse matrix, and stores to this

        var ap = this.m;
        var dimen = this.row;
        var dimen_1 = dimen - 1;
        var ap_n, ap_ip, ap_i; // wap;
        var j, ip, nwork;
        var nos = this.__matrixSelfInv_nos; //Work variable
        // double epsl
        var p, pbuf, work;

        // check size
        switch (dimen) {
            case 0:
                throw new NyARException();
            case 1:
                ap[0][0] = 1.0 / ap[0][0];// *ap = 1.0 / (*ap);
                return true; // 1 dimension 
        }
        var n;
        for (n = 0; n < dimen; n++) {
            nos[n] = n;
        }

        //Insert because there are cases where the calculation is performed in is not determined nyatla memo ip. I do not know whether you want to 0 initialization in a loop.
        ip = 0;
        // For. order change ban
        for (n = 0; n < dimen; n++) {
            ap_n = ap[n];// wcp = ap + n * rowa;
            p = 0.0;
            for (var i = n; i < dimen; i++) {
                if (p < (pbuf = Math.abs(ap[i][0]))) {
                    p = pbuf;
                    ip = i;
                }
            }
            // if (p <= matrixSelfInv_epsl){
            if (p == 0.0) {
                return false;
                // throw new NyARException();
            }

            nwork = nos[ip];
            nos[ip] = nos[n];
            nos[n] = nwork;

            ap_ip = ap[ip];
            for (j = 0; j < dimen; j++) {// for(j = 0, wap = ap + ip * rowa,
                // wbp = wcp; j < dimen ; j++) {
                work = ap_ip[j]; // work = *wap;
                ap_ip[j] = ap_n[j];
                ap_n[j] = work;
            }

            work = ap_n[0];
            for (j = 0; j < dimen_1; j++) {
                ap_n[j] = ap_n[j + 1] / work;// *wap = *(wap + 1) / work;
            }
            ap_n[j] = 1.0 / work;// *wap = 1.0 / work;
            for (i = 0; i < dimen; i++) {
                if (i != n) {
                    ap_i = ap[i];// wap = ap + i * rowa;
                    work = ap_i[0];
                    for (j = 0; j < dimen_1; j++) {// for(j = 1, wbp = wcp,work = *wap;j < dimen ;j++, wap++, wbp++)
                        ap_i[j] = ap_i[j + 1] - work * ap_n[j];// wap = *(wap +1) - work *(*wbp);
                    }
                    ap_i[j] = -work * ap_n[j];// *wap = -work * (*wbp);
                }
            }
        }

        for (n = 0; n < dimen; n++) {
            for (j = n; j < dimen; j++) {
                if (nos[j] == n) {
                    break;
                }
            }
            nos[j] = nos[n];
            for (i = 0; i < dimen; i++) {
                ap_i = ap[i];
                work = ap_i[j];// work = *wap;
                ap_i[j] = ap_i[n];// *wap = *wbp;
                ap_i[n] = work;// *wbp = work;
            }
        }
        return true;
    }
});

ArrayUtils = ASKlass('ArrayUtils', {
    create2dInt: function(height, width)
    {
        var r = new Array(height);
        for (var i = 0; i < height; i++) {
            r[i] = new IntVector(width);
        }
        return r;
    }
    ,
    create2dNumber: function(height, width) {
        var r = new Array(height);
        for (var i = 0; i < height; i++) {
            r[i] = new FloatVector(width);
        }
        return r;
    }
    ,
    copyInt: function(src, srcPos, dest, destPos, length) {
        for (var i = 0; i < length; i++) {
            dest[destPos + i] = src[srcPos + i];
        }
    }
});

ArrayUtil = ASKlass('ArrayUtil', {
    createJaggedArray: function(len) {
        var arr = new Array(len);
        var args = toArray(arguments).slice(1);
        while (len--) {
            arr[len] = args.length ? this.createJaggedArray.apply(null, args) : 0;
        }
        return arr;
    }
    , create2d: function(height, width) {
        return this.createJaggedArray(height, width);
    }
    , create3d: function(depth, height, width) {
        return this.createJaggedArray(depth, height, width);
    }
    , copy: function(src, srcPos, dest, destPos, length) {
        for (var i = 0; i < length; i++) {
            dest[destPos + i] = src[srcPos + i];
        }
    }
});

FLARException = ASKlass('FLARException', NyARException, {
    FLARException: function(m) {
        NyARException.initialize.call(this, m || '');
    },
    trap: function(m) {
        throw new FLARException("trap:" + m);
    },
    notImplement: function() {
        throw new FLARException("Not Implement!");
    }
});

FLARMat = NyARMat;

FLARGrayPixelReader_BitmapData = ASKlass('FLARGrayPixelReader_BitmapData', {
    _ref_bitmap: null
    ,
    FLARGrayPixelReader_BitmapData: function(i_buffer) {
        this._ref_bitmap = i_buffer;
    }
    ,
    getPixel: function(i_x, i_y, i_num, o_gray) {
        NyARException.notImplement();
        var w = this._ref_bitmap.getWidth();
        var d = this._ref_bitmap.getBuffer();
        o_gray[0] = o_gray[1] = o_gray[2] = ~d(i_x + w * i_y) & 0xff;
    }
    ,
    getPixelSet: function(i_x, i_y, i_num, o_gray) {
        var w = this._ref_bitmap.getWidth();
        var d = this._ref_bitmap.data;
        for (var i = 0; i < i_num; i++) {

            var cv = document.getElementById('debugCanvas').getContext('2d');
            cv.fillRect(i_x[i], i_y[i], 5, 5);

            o_gray[i] = ~d[i_x[i] + w * i_y[i]] & 0xff;
        }
    }
    ,
    setPixel: function(i_x, i_y, i_rgb) {
        NyARException.notImplement();
    }
    ,
    setPixels: function(i_x, i_y, i_num, i_intrgb) {
        NyARException.notImplement();
    }
    ,
    switchBuffer: function(i_ref_buffer) {
        NyARException.notImplement();
    }
});

INyARHistogramAnalyzer_Threshold = ASKlass('INyARHistogramAnalyzer_Threshold', {
    getThreshold: function(i_histgram) {
    }
});

NyARHistogramAnalyzer_SlidePTile = ASKlass('NyARHistogramAnalyzer_SlidePTile', INyARHistogramAnalyzer_Threshold, {
    _persentage: 0,
    NyARHistogramAnalyzer_SlidePTile: function(i_persentage) {
        NyAS3Utils.assert(0 <= i_persentage && i_persentage <= 50);
        this._persentage = i_persentage; //Initialization
    }
    ,
    getThreshold: function(i_histgram) {
        // Calculate the total number of pixels
        var n = i_histgram.length;
        var sum_of_pixel = i_histgram.total_of_data;
        var hist = i_histgram.data;
        // Threshold number of pixels determined
        var th_pixcels = sum_of_pixel * this._persentage / 100;
        var th_wk;
        var th_w, th_b;
        // Sunspot criteria
        th_wk = th_pixcels;
        for (th_b = 0; th_b < n - 2; th_b++) {
            th_wk -= hist[th_b];
            if (th_wk <= 0) {
                break;
            }
        }
        // White reference point
        th_wk = th_pixcels;
        for (th_w = n - 1; th_w > 1; th_w--) {
            th_wk -= hist[th_w];
            if (th_wk <= 0) {
                break;
            }
        }

        return (th_w + th_b) / 2; // Save threshold
    }
});

INyARPca2d = ASKlass('INyARPca2d', {
    // @param o_evec = variable element of 2
    // @param o_ev = variable element of 2
    pca: function(i_v1, i_v2, i_number_of_point, o_evec, o_ev, o_mean) { // PCA normal
    }
});

NyARPca2d_MatrixPCA_O2 = ASKlass('NyARPca2d_MatrixPCA_O2', INyARPca2d, {
    PCA_EPS: 1e-6, // #define EPS 1e-6
    PCA_MAX_ITER: 100, // #define MAX_ITER 100
    PCA_VZERO: 1e-16, // #define VZERO 1e-16
    PCA_QRM: function(o_matrix, dv) { // static int QRM( ARMat *a, ARVec *dv ) (alternate function)
        var w, t, s, x, y, c;
        var ev1;
        var dv_x, dv_y;
        var mat00, mat01, mat10, mat11;
        // this.vecTridiagonalize2d(i_mat, dv, ev)
        dv_x = o_matrix.m00;// this.m[dim - 2][dim - 2];// d.v[dim-2]=a.m[dim-2][dim-2];//d->v[dim-2]=a->m[(dim-2)*dim+(dim-2)];
        ev1 = o_matrix.m01;// this.m[dim - 2][dim - 1];// e.v[dim-2+i_e_start]=a.m[dim-2][dim-1];//e->v[dim-2] = a->m[(dim-2)*dim+(dim-1)];
        dv_y = o_matrix.m11;// this.m[dim - 1][dim - 1];// d.v[dim-1]=a_array[dim-1][dim-1];//d->v[dim-1] =a->m[(dim-1)*dim+(dim-1)];
        // unit matrix
        mat00 = mat11 = 1;
        mat01 = mat10 = 0;

        var iter = 0;
        do {
            iter++;
            if (iter > this.PCA_MAX_ITER) {
                break;
            }
            w = (dv_x - dv_y) / 2;
            t = ev1 * ev1;
            s = Math.sqrt(w * w + t);
            if (w < 0) {
                s = -s;
            }
            x = dv_x - dv_y + t / (w + s);
            y = ev1;
            if (Math.abs(x) >= Math.abs(y)) {
                if (Math.abs(x) > this.PCA_VZERO) {
                    t = -y / x;
                    c = 1 / Math.sqrt(t * t + 1);
                    s = t * c;
                } else {
                    c = 1.0;
                    s = 0.0;
                }
            } else {
                t = -x / y;
                s = 1.0 / Math.sqrt(t * t + 1);
                c = t * s;
            }
            w = dv_x - dv_y;
            t = (w * s + 2 * c * ev1) * s;
            dv_x -= t;
            dv_y += t;
            ev1 += s * (c * w - 2 * s * ev1);
            x = mat00;
            y = mat10;
            mat00 = c * x - s * y;
            mat10 = s * x + c * y;
            x = mat01;
            y = mat11;
            mat01 = c * x - s * y;
            mat11 = s * x + c * y;
        } while (Math.abs(ev1) > this.PCA_EPS * (Math.abs(dv_x) + Math.abs(dv_y)));

        t = dv_x;
        if (dv_y > t) {
            t = dv_y;
            dv_y = dv_x;
            dv_x = t;
            // Replacement of the line
            o_matrix.m00 = mat10;
            o_matrix.m01 = mat11;
            o_matrix.m10 = mat00;
            o_matrix.m11 = mat01;
        } else {
            // No replacement of line
            o_matrix.m00 = mat00;
            o_matrix.m01 = mat01;
            o_matrix.m10 = mat10;
            o_matrix.m11 = mat11;
        }
        dv[0] = dv_x;
        dv[1] = dv_y;
        return;
    }
    ,
    PCA_PCA: function(i_v1, i_v2, i_number_of_data, o_matrix, o_ev, o_mean) { //Static int PCA (ARMat * input, ARMat * output, ARVec * ev) 
        var i;
        // double[] mean_array=mean.getArray();
        // mean.zeroClear();
        //PCA_Processing of EX
        var sx = 0;
        var sy = 0;
        for (i = 0; i < i_number_of_data; i++) {
            sx += i_v1[i];
            sy += i_v2[i];
        }
        sx = sx / i_number_of_data;
        sy = sy / i_number_of_data;
        // processing together PCA_xt_by_x and PCA_CENTER
        var srow = Math.sqrt((i_number_of_data));
        var w00, w11, w10;
        w00 = w11 = w10 = 0.0;// *out = 0.0;
        for (i = 0; i < i_number_of_data; i++) {
            var x = (i_v1[i] - sx) / srow;
            var y = (i_v2[i] - sy) / srow;
            w00 += (x * x);// *out += *in1 * *in2;
            w10 += (x * y);// *out += *in1 * *in2;
            w11 += (y * y);// *out += *in1 * *in2;
        }
        o_matrix.m00 = w00;
        o_matrix.m01 = o_matrix.m10 = w10;
        o_matrix.m11 = w11;
        // Processing of PCA_PCA
        this.PCA_QRM(o_matrix, o_ev);
        // m2 = o_output.m;// m2 = output->m;
        if (o_ev[0] < this.PCA_VZERO) {// if( ev->v[i] < VZERO ){
            o_ev[0] = 0.0;// ev->v[i] = 0.0;
            o_matrix.m00 = 0.0;// *(m2++) = 0.0;
            o_matrix.m01 = 0.0;// *(m2++) = 0.0;
        }
        if (o_ev[1] < this.PCA_VZERO) {// if( ev->v[i] < VZERO ){
            o_ev[1] = 0.0;// ev->v[i] = 0.0;
            o_matrix.m10 = 0.0;// *(m2++) = 0.0;
            o_matrix.m11 = 0.0;// *(m2++) = 0.0;
        }
        o_mean[0] = sx;
        o_mean[1] = sy;
        return;
    }
    ,
    pca: function(i_v1, i_v2, i_number_of_point, o_evec, o_ev, o_mean) {
        this.PCA_PCA(i_v1, i_v2, i_number_of_point, o_evec, o_ev, o_mean);
        var sum = o_ev[0] + o_ev[1];
        // For order change ban
        o_ev[0] /= sum; // ev->v[i] /= sum;
        o_ev[1] /= sum; // ev->v[i] /= sum;
        return;
    }
});

INyARRgbPixelReader = ASKlass('INyARRgbPixelReader', { // Interface to read the pixels R8G8B8

    getPixel: function(i_x, i_y, o_rgb) { //  Returns in the int array one pixel
    }
    ,
    // @param i_x = index array of x
    // @param i_y = index array of y
    // @param i_num = number of pixel values ​​to return
    // @param i_rgb = buffer in which to return the pixel value
    getPixelSet: function(i_x, i_y, i_num, o_rgb) { // return to i_rgb a plurality of pixel values​​
    }
    ,
    setPixel: function(i_x, i_y, i_rgb) { // set one pixel.
    }
    ,
    setPixels: function(i_x, i_y, i_num, i_intrgb) { // set from int array a plurality of pixel values​​
    }
    ,
    switchBuffer: function(i_ref_buffer) {
    }
});

NyARRgbPixelReader_Canvas2D = ASKlass("NyARRgbPixelReader_Canvas2D", INyARRgbPixelReader, {
    _ref_canvas: null,
    _data: null
    ,
    NyARRgbPixelReader_Canvas2D: function(i_canvas) {
        this._ref_canvas = i_canvas;
    }
    ,
    getData: function() {
        if (this._ref_canvas.changed || !this._data) {
            var canvas = this._ref_canvas;
            var ctx = canvas.getContext('2d');
            this._data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            this._ref_canvas.changed = false;
        }
        return this._data;
    }
    ,
    getPixel: function(i_x, i_y, o_rgb) {
        var idata = this.getData();
        var w = idata.width;
        var h = idata.height;
        var d = idata.data;
        o_rgb[0] = d[i_y * w + i_x]; // R
        o_rgb[1] = d[i_y * w + i_x + 1]; // G
        o_rgb[2] = d[i_y * w + i_x + 2]; // B
        return;
    }
    ,
    getPixelSet: function(i_x, i_y, i_num, o_rgb) {
        console.log(123456)
        var idata = this.getData();
        var w = idata.width;
        var h = idata.height;
        var d = idata.data;
        for (var i = 0; i < i_num; i++) {
            var idx = i_y[i] * w * 4 + i_x[i] * 4;
            o_rgb[i * 3 + 0] = d[idx + 0];
            o_rgb[i * 3 + 1] = d[idx + 1];
            o_rgb[i * 3 + 2] = d[idx + 2];
        }
    }
    ,
    setPixel: function(i_x, i_y, i_rgb) {
        NyARException.notImplement();
    }
    ,
    setPixels: function(i_x, i_y, i_num, i_intrgb) {
        NyARException.notImplement();
    }
    ,
    switchBuffer: function(i_canvas) {
        NyARException.notImplement();
    }
});

INyARDoubleMatrix = Klass({
    // set matrix to the contents of the array.
    // not use too much because it slow
    setValue: function(o_value) {
    }, // double[]

    // return array of the contents of the matrix.
    // not use too much because it slow.
    getValue: function(o_value) {
    } // double[]
});

NyARDoubleMatrix22 = Klass(INyARDoubleMatrix, {
    m00: 0,
    m01: 0,
    m10: 0,
    m11: 0,
    setValue: function(i_value) { // not use it so much slower
        this.m00 = i_value[0];
        this.m01 = i_value[1];
        this.m10 = i_value[3];
        this.m11 = i_value[4];
        return;
    }
    ,
    getValue: function(o_value) { // not use it so much slower
        o_value[0] = this.m00;
        o_value[1] = this.m01;
        o_value[3] = this.m10;
        o_value[4] = this.m11;
        return;
    }
    ,
    inverse: function(i_src) {
        var a11, a12, a21, a22;
        a11 = i_src.m00;
        a12 = i_src.m01;
        a21 = i_src.m10;
        a22 = i_src.m11;
        var det = a11 * a22 - a12 * a21;
        if (det == 0) {
            return false;
        }
        det = 1 / det;
        this.m00 = a22 * det;
        this.m01 = -a12 * det;
        this.m10 = -a21 * det;
        this.m11 = a11 * det;
        return true;
    }
});

NyARDoubleMatrix33 = Klass(INyARDoubleMatrix, {
    m00: 0,
    m01: 0,
    m02: 0,
    m10: 0,
    m11: 0,
    m12: 0,
    m20: 0,
    m21: 0,
    m22: 0,
    createArray: function(i_number) {
        var ret = new Array(i_number);
        for (var i = 0; i < i_number; i++)
        {
            ret[i] = new NyARDoubleMatrix33();
        }
        return ret;
    }
    ,
    setValue: function(i_value) { // not use it so much slower
        this.m00 = i_value[0];
        this.m01 = i_value[1];
        this.m02 = i_value[2];
        this.m10 = i_value[3];
        this.m11 = i_value[4];
        this.m12 = i_value[5];
        this.m20 = i_value[6];
        this.m21 = i_value[7];
        this.m22 = i_value[8];
        return;
    }
    ,
    setValue_NyARDoubleMatrix33: function(i_value) {
        this.m00 = i_value.m00;
        this.m01 = i_value.m01;
        this.m02 = i_value.m02;
        this.m10 = i_value.m10;
        this.m11 = i_value.m11;
        this.m12 = i_value.m12;
        this.m20 = i_value.m20;
        this.m21 = i_value.m21;
        this.m22 = i_value.m22;
        return;
    }
    ,
    getValue: function(o_value) { // not use it so much slower
        o_value[0] = this.m00;
        o_value[1] = this.m01;
        o_value[2] = this.m02;
        o_value[3] = this.m10;
        o_value[4] = this.m11;
        o_value[5] = this.m12;
        o_value[6] = this.m20;
        o_value[7] = this.m21;
        o_value[8] = this.m22;
        return;
    }
    ,
    inverse: function(i_src) {
        var a11, a12, a13, a21, a22, a23, a31, a32, a33;
        var b11, b12, b13, b21, b22, b23, b31, b32, b33;
        a11 = i_src.m00;
        a12 = i_src.m01;
        a13 = i_src.m02;
        a21 = i_src.m10;
        a22 = i_src.m11;
        a23 = i_src.m12;
        a31 = i_src.m20;
        a32 = i_src.m21;
        a33 = i_src.m22;

        b11 = a22 * a33 - a23 * a32;
        b12 = a32 * a13 - a33 * a12;
        b13 = a12 * a23 - a13 * a22;

        b21 = a23 * a31 - a21 * a33;
        b22 = a33 * a11 - a31 * a13;
        b23 = a13 * a21 - a11 * a23;

        b31 = a21 * a32 - a22 * a31;
        b32 = a31 * a12 - a32 * a11;
        b33 = a11 * a22 - a12 * a21;

        var det_1 = a11 * b11 + a21 * b12 + a31 * b13;
        if (det_1 == 0) {
            return false;
        }
        det_1 = 1 / det_1;

        this.m00 = b11 * det_1;
        this.m01 = b12 * det_1;
        this.m02 = b13 * det_1;

        this.m10 = b21 * det_1;
        this.m11 = b22 * det_1;
        this.m12 = b23 * det_1;

        this.m20 = b31 * det_1;
        this.m21 = b32 * det_1;
        this.m22 = b33 * det_1;

        return true;
    }
    // This function returns a value between,0-PI
    ,
    getZXYAngle: function(o_out) {
        var sina = this.m21;
        if (sina >= 1.0) {
            o_out.x = Math.PI / 2;
            o_out.y = 0;
            o_out.z = Math.atan2(-this.m10, this.m00);
        } else if (sina <= -1.0) {
            o_out.x = -Math.PI / 2;
            o_out.y = 0;
            o_out.z = Math.atan2(-this.m10, this.m00);
        } else {
            o_out.x = Math.asin(sina);
            o_out.z = Math.atan2(-this.m01, this.m11);
            o_out.y = Math.atan2(-this.m20, this.m22);
        }
    }
    ,
    setZXYAngle_NyARDoublePoint3d: function(i_angle) {
        this.setZXYAngle_Number(i_angle.x, i_angle.y, i_angle.z);
        return;
    }
    ,
    setZXYAngle_Number: function(i_x, i_y, i_z) {
        var sina = Math.sin(i_x);
        var cosa = Math.cos(i_x);
        var sinb = Math.sin(i_y);
        var cosb = Math.cos(i_y);
        var sinc = Math.sin(i_z);
        var cosc = Math.cos(i_z);
        this.m00 = cosc * cosb - sinc * sina * sinb;
        this.m01 = -sinc * cosa;
        this.m02 = cosc * sinb + sinc * sina * cosb;
        this.m10 = sinc * cosb + cosc * sina * sinb;
        this.m11 = cosc * cosa;
        this.m12 = sinc * sinb - cosc * sina * cosb;
        this.m20 = -cosa * sinb;
        this.m21 = sina;
        this.m22 = cosb * cosa;
        return;
    }
    ,
    // coordinate transformation to adapt the rotation matrix
    transformVertex_NyARDoublePoint3d: function(i_position, o_out) {
        transformVertex_double(i_position.x, i_position.y, i_position.z, o_out);
        return;
    }
    ,
    transformVertex_double: function(i_x, i_y, i_z, o_out) {
        o_out.x = this.m00 * i_x + this.m01 * i_y + this.m02 * i_z;
        o_out.y = this.m10 * i_x + this.m11 * i_y + this.m12 * i_z;
        o_out.z = this.m20 * i_x + this.m21 * i_y + this.m22 * i_z;
        return;
    }
});

NyARDoubleMatrix34 = Klass(INyARDoubleMatrix, {
    m00: 0,
    m01: 0,
    m02: 0,
    m03: 0,
    m10: 0,
    m11: 0,
    m12: 0,
    m13: 0,
    m20: 0,
    m21: 0,
    m22: 0,
    m23: 0,
    setValue: function(i_value) {
        this.m00 = i_value[0];
        this.m01 = i_value[1];
        this.m02 = i_value[2];
        this.m03 = i_value[3];
        this.m10 = i_value[4];
        this.m11 = i_value[5];
        this.m12 = i_value[6];
        this.m13 = i_value[7];
        this.m20 = i_value[8];
        this.m21 = i_value[9];
        this.m22 = i_value[10];
        this.m23 = i_value[11];
        return;
    }
    ,
    setValue_NyARDoubleMatrix34: function(i_value) {
        this.m00 = i_value.m00;
        this.m01 = i_value.m01;
        this.m02 = i_value.m02;
        this.m03 = i_value.m03;
        this.m10 = i_value.m10;
        this.m11 = i_value.m11;
        this.m12 = i_value.m12;
        this.m13 = i_value.m13;
        this.m20 = i_value.m20;
        this.m21 = i_value.m21;
        this.m22 = i_value.m22;
        this.m23 = i_value.m23;
        return;
    }
    ,
    getValue: function(o_value) {
        o_value[0] = this.m00;
        o_value[1] = this.m01;
        o_value[2] = this.m02;
        o_value[3] = this.m03;
        o_value[4] = this.m10;
        o_value[5] = this.m11;
        o_value[6] = this.m12;
        o_value[7] = this.m13;
        o_value[8] = this.m20;
        o_value[9] = this.m21;
        o_value[10] = this.m22;
        o_value[11] = this.m23;
        return;
    }
});

NyARDoubleMatrix44 = Klass(INyARDoubleMatrix, {
    m00: 0,
    m01: 0,
    m02: 0,
    m03: 0,
    m10: 0,
    m11: 0,
    m12: 0,
    m13: 0,
    m20: 0,
    m21: 0,
    m22: 0,
    m23: 0,
    m30: 0,
    m31: 0,
    m32: 0,
    m33: 0,
    createArray: function(i_number) {
        var ret = new Array(i_number);
        for (var i = 0; i < i_number; i++) {
            ret[i] = new NyARDoubleMatrix44();
        }
        return ret;
    }
    ,
    setValue: function(i_value) { // not use it so much slower.
        this.m00 = i_value[ 0];
        this.m01 = i_value[ 1];
        this.m02 = i_value[ 2];
        this.m03 = i_value[ 3];
        this.m10 = i_value[ 4];
        this.m11 = i_value[ 5];
        this.m12 = i_value[ 6];
        this.m13 = i_value[ 7];
        this.m20 = i_value[ 8];
        this.m21 = i_value[ 9];
        this.m22 = i_value[10];
        this.m23 = i_value[11];
        this.m30 = i_value[12];
        this.m31 = i_value[13];
        this.m32 = i_value[14];
        this.m33 = i_value[15];
        return;
    }
    ,
    getValue: function(o_value) { // not use it so much slower.
        o_value[ 0] = this.m00;
        o_value[ 1] = this.m01;
        o_value[ 2] = this.m02;
        o_value[ 3] = this.m03;
        o_value[ 4] = this.m10;
        o_value[ 5] = this.m11;
        o_value[ 6] = this.m12;
        o_value[ 7] = this.m13;
        o_value[ 8] = this.m20;
        o_value[ 9] = this.m21;
        o_value[10] = this.m22;
        o_value[11] = this.m23;
        o_value[12] = this.m30;
        o_value[13] = this.m31;
        o_value[14] = this.m32;
        o_value[15] = this.m33;
        return;
    }
    ,
    inverse: function(i_src) {
        var a11, a12, a13, a14, a21, a22, a23, a24, a31, a32, a33, a34, a41, a42, a43, a44;
        var b11, b12, b13, b14, b21, b22, b23, b24, b31, b32, b33, b34, b41, b42, b43, b44;
        var t1, t2, t3, t4, t5, t6;
        a11 = i_src.m00;
        a12 = i_src.m01;
        a13 = i_src.m02;
        a14 = i_src.m03;
        a21 = i_src.m10;
        a22 = i_src.m11;
        a23 = i_src.m12;
        a24 = i_src.m13;
        a31 = i_src.m20;
        a32 = i_src.m21;
        a33 = i_src.m22;
        a34 = i_src.m23;
        a41 = i_src.m30;
        a42 = i_src.m31;
        a43 = i_src.m32;
        a44 = i_src.m33;

        t1 = a33 * a44 - a34 * a43;
        t2 = a34 * a42 - a32 * a44;
        t3 = a32 * a43 - a33 * a42;
        t4 = a34 * a41 - a31 * a44;
        t5 = a31 * a43 - a33 * a41;
        t6 = a31 * a42 - a32 * a41;

        b11 = a22 * t1 + a23 * t2 + a24 * t3;
        b21 = -(a23 * t4 + a24 * t5 + a21 * t1);
        b31 = a24 * t6 - a21 * t2 + a22 * t4;
        b41 = -(a21 * t3 - a22 * t5 + a23 * t6);

        t1 = a43 * a14 - a44 * a13;
        t2 = a44 * a12 - a42 * a14;
        t3 = a42 * a13 - a43 * a12;
        t4 = a44 * a11 - a41 * a14;
        t5 = a41 * a13 - a43 * a11;
        t6 = a41 * a12 - a42 * a11;

        b12 = -(a32 * t1 + a33 * t2 + a34 * t3);
        b22 = a33 * t4 + a34 * t5 + a31 * t1;
        b32 = -(a34 * t6 - a31 * t2 + a32 * t4);
        b42 = a31 * t3 - a32 * t5 + a33 * t6;

        t1 = a13 * a24 - a14 * a23;
        t2 = a14 * a22 - a12 * a24;
        t3 = a12 * a23 - a13 * a22;
        t4 = a14 * a21 - a11 * a24;
        t5 = a11 * a23 - a13 * a21;
        t6 = a11 * a22 - a12 * a21;

        b13 = a42 * t1 + a43 * t2 + a44 * t3;
        b23 = -(a43 * t4 + a44 * t5 + a41 * t1);
        b33 = a44 * t6 - a41 * t2 + a42 * t4;
        b43 = -(a41 * t3 - a42 * t5 + a43 * t6);

        t1 = a23 * a34 - a24 * a33;
        t2 = a24 * a32 - a22 * a34;
        t3 = a22 * a33 - a23 * a32;
        t4 = a24 * a31 - a21 * a34;
        t5 = a21 * a33 - a23 * a31;
        t6 = a21 * a32 - a22 * a31;

        b14 = -(a12 * t1 + a13 * t2 + a14 * t3);
        b24 = a13 * t4 + a14 * t5 + a11 * t1;
        b34 = -(a14 * t6 - a11 * t2 + a12 * t4);
        b44 = a11 * t3 - a12 * t5 + a13 * t6;

        var det_1 = (a11 * b11 + a21 * b12 + a31 * b13 + a41 * b14);
        if (det_1 == 0) {
            return false;
        }
        det_1 = 1 / det_1;

        this.m00 = b11 * det_1;
        this.m01 = b12 * det_1;
        this.m02 = b13 * det_1;
        this.m03 = b14 * det_1;

        this.m10 = b21 * det_1;
        this.m11 = b22 * det_1;
        this.m12 = b23 * det_1;
        this.m13 = b24 * det_1;

        this.m20 = b31 * det_1;
        this.m21 = b32 * det_1;
        this.m22 = b33 * det_1;
        this.m23 = b34 * det_1;

        this.m30 = b41 * det_1;
        this.m31 = b42 * det_1;
        this.m32 = b43 * det_1;
        this.m33 = b44 * det_1;

        return true;
    }
});

// Variable-length array of stacked.
// store the entity in the array.

// Notes
// Aimed at limiting breakthrough of Generics of Java, but in Vector. <*>, For trouble is large, the change to. <Object> Vector
// You may receive an error may appear in some places, but in such as compile option,
// strict = be avoided by setting the false.
// Root fix is ​​scheduled to be addressed in the next version or later.
NyARObjectStack = Klass({
    _items: null,
    _length: 0
    ,
    initialize: function(i_length) { // prepare a dynamic buffer allocation of maximum ARRAY_MAX individual.
        // Partitioning
        i_length = toInt(i_length);
        this._items = this.createArray(i_length);
        this._length = 0; //Reset busy number
        return;
    }
    ,
    // Where you decide whether to store what array (Vector).
    // override this function.
    createArray: function(i_length) {
        throw new NyARException();
    }
    ,
    prePush: function() { // reserve a new area (return Null on failure)
        // Allocated as needed
        if (this._length >= this._items.length) {
            return null;
        }
        // To +1 space used, and return the space reservation.
        var ret = this._items[this._length];
        this._length++;
        return ret;
    }
    ,
    // @param i_reserv_length = Size to be used to
    init: function(i_reserv_length) { // initialize the stack.
        // Allocated as needed
        if (i_reserv_length >= this._items.length) {
            throw new NyARException();
        }
        this._length = i_reserv_length;
    }
    ,
    // By reducing the number of elements one of apparent, and returns the object
    // The contents of the object you return is valid until the next push
    pop: function() {
        NyAS3Utils.assert(this._length >= 1);
        this._length--;
        return this._items[this._length];
    }
    ,
    // reduce i_count individual the number of elements of apparent
    pops: function(i_count) {
        NyAS3Utils.assert(this._length >= i_count);
        this._length -= i_count;
        return;
    }
    ,
    // return an array.
    getArray: function() {
        return this._items;
    }

    , getItem: function(i_index) {
        return this._items[i_index];
    }
    ,
    // return the number of elements in the array apparent.
    getLength: function() {
        return this._length;
    }
    ,
    // reset the number of elements of apparent.    
    clear: function() {
        this._length = 0;
    }
});

NyARIntPointStack = Klass(NyARObjectStack, {
    initialize: function(i_length) {
        NyARObjectStack.initialize.call(this, i_length);
    }
    ,
    createArray: function(i_length) {
        var ret = new Array(i_length);
        for (var i = 0; i < i_length; i++) {
            ret[i] = new NyARIntPoint2d();
        }
        return ret;
    }
});

// import jp.nyatla.nyartoolkit.as3.core.types.*;
NyARIntRectStack = Klass(/*NyARObjectStack,*/ {
    _items: null,
    _length: null
    ,
    initialize: function(i_length) {
        this._items = this.createArray(i_length); // Partitioning        
        this._length = 0; // Reset busy number
        return;
    }
    ,
    createArray: function(i_length) {
        var ret = new Array(i_length);
        for (var i = 0; i < i_length; i++) {
            ret[i] = new NyARIntRect();
        }
        return ret;
    }
    ,
    // reserve a new area, return Null on failure
    prePush: function() {
        // Allocated as needed
        if (this._length >= this._items.length) {
            return null;
        }
        // To +1 the use area , Returns the space reservation
        var ret = this._items[this._length];
        this._length++;
        return ret;
    }
    ,
    // @param i_reserv_length = Size to be used to
    init: function(i_reserv_length) { // initialize the stack        
        if (i_reserv_length >= this._items.length) { // Allocated as needed
            throw new NyARException();
        }
        this._length = i_reserv_length;
    }
    ,
    // By reducing the number of elements one of apparent, and returns the object
    // The contents of the object you return is valid until the next push
    pop: function() {
        NyAS3Utils.assert(this._length >= 1);
        this._length--;
        return this._items[this._length];
    }
    ,
    pops: function(i_count) { // reduce i_count individual the number of elements of apparent.
        NyAS3Utils.assert(this._length >= i_count);
        this._length -= i_count;
        return;
    }
    ,
    getArray: function() { // return an array.
        return this._items;
    }
    ,
    getItem: function(i_index) {
        return this._items[i_index];
    }
    ,
    getLength: function() { // return the number of elements in the array apparent
        return this._length;
    }
    ,
    clear: function() { // reset the number of elements of apparent.
        this._length = 0;
    }
});

NyARBufferType = Klass((
        function() {
            var T_BYTE1D = 0x00010000;
            var T_INT2D = 0x00020000;
            var T_SHORT1D = 0x00030000;
            var T_INT1D = 0x00040000;
            var T_OBJECT = 0x00100000;
            var T_USER = 0x00FF0000;

            return ({
                //  24-31(8) Reservation
                //  16-27(8) Type ID
                //      00:Disable/01[]/02[][]/03[]
                //  08-15(8)ビットフォーマットID
                //      00/01/02
                //  00-07(8)Model number

                NULL_ALLZERO: 0x00000001, // In RGB24 format, all the pixels 0

                USER_DEFINE: T_USER, // USER - USER + 0xFFFF is user-defined type. For experimentation.

                BYTE1D_R8G8B8_24: T_BYTE1D | 0x0001, // Pixels stored in 24-bit R8G8B8 (byte[])

                BYTE1D_B8G8R8_24: T_BYTE1D | 0x0002, // Pixels stored in 24-bit B8G8R8 (byte[])

                BYTE1D_B8G8R8X8_32: T_BYTE1D | 0x0101, // Pixels stored in 32-bit R8G8B8X8 (byte[])

                BYTE1D_X8R8G8B8_32: T_BYTE1D | 0x0102, // Pixels stored in 32-bit X8R8G8B8 (byte[])

                // Pixels stored in a (little / big endian) 16-bit RGB565 (byte[])
                BYTE1D_R5G6B5_16LE: T_BYTE1D | 0x0201,
                BYTE1D_R5G6B5_16BE: T_BYTE1D | 0x0202,
                //Pixels are stored in a (little / big endian) 16-bit RGB565 (byte[])
                WORD1D_R5G6B5_16LE: T_SHORT1D | 0x0201,
                WORD1D_R5G6B5_16BE: T_SHORT1D | 0x0202,
                INT2D: T_INT2D | 0x0000, // In it does not define the value range in particular (int[][])

                INT2D_GRAY_8: T_INT2D | 0x0001, // In gray scale image of 0-255 (int[][])

                // This is the same tone value of BUFFERFORMAT_INT2D_GRAY_1 1bit.
                INT2D_BIN_8: T_INT2D | 0x0002, // In the binary image of the 0/1 (int[][])

                INT1D: T_INT1D | 0x0000, // In it does not define the value range in particular (int[])

                INT1D_GRAY_8: T_INT1D | 0x0001, // In gray scale image of 0-255 (int[])

                // This is the same tone of INT1D_GRAY_1 1bit
                INT1D_BIN_8: T_INT1D | 0x0002, // In the binary image of the 0/1 (int[])

                INT1D_X8R8G8B8_32: T_INT1D | 0x0102, // Pixels are stored in 32-bit XRGB32 (int[])

                INT1D_X7H9S8V8_32: T_INT1D | 0x0103, // H(0-359),S(0-255),V(0-255)

                // Platform-specific object
                OBJECT_Java: T_OBJECT | 0x0100,
                OBJECT_CS: T_OBJECT | 0x0200,
                OBJECT_AS3: T_OBJECT | 0x0300,
                OBJECT_JS: T_OBJECT | 0x0400,
                // Raster that contains the BufferedImage of Java
                OBJECT_Java_BufferedImage: T_OBJECT | 0x0100 | 0x01,
                OBJECT_AS3_BitmapData: T_OBJECT | 0x0300 | 0x01,
                // Raster that contains the Canvas and JavaScript
                OBJECT_JS_Canvas: T_OBJECT | 0x0400 | 0x01
            });
        }
)());

NyARDoublePoint2d = Klass({
    x: 0,
    y: 0
    ,
    createArray: function(i_number) { // Array factory
        var ret = new Array(i_number);
        for (var i = 0; i < i_number; i++)
        {
            ret[i] = new NyARDoublePoint2d();
        }
        return ret;
    }
    ,
    initialize: function() {
        switch (arguments.length) {
            case 0:
                { //public function NyARDoublePoint2d()
                    this.x = 0;
                    this.y = 0;
                }
                return;
            case 1:
                this.x = args[0].x;
                this.y = args[0].y;
                return;
                break;
            case 2:
                { //public function NyARDoublePoint2d(i_x,i_y)
                    this.x = Number(args[0]);
                    this.y = Number(args[1]);
                    return;
                }
            default:
                break;
        }
        throw new NyARException();
    }
    ,
    setValue_NyARDoublePoint2d: function(i_src) {
        this.x = i_src.x;
        this.y = i_src.y;
        return;
    }
    ,
    setValue_NyARIntPoint2d: function(i_src) {
        this.x = (i_src.x);
        this.y = (i_src.y);
        return;
    }
    ,
    dist: function() { // As vectors stored value, return the distance
        return Math.sqrt(this.x * this.x + this.y + this.y);
    }
    ,
    sqNorm: function() {
        return this.x * this.x + this.y + this.y;
    }
});

NyARDoublePoint3d = Klass({
    x: 0,
    y: 0,
    z: 0,
    createArray: function(i_number) { // Array factory
        var ret = new Array(i_number);
        for (var i = 0; i < i_number; i++)
        {
            ret[i] = new NyARDoublePoint3d();
        }
        return ret;
    }
    ,
    setValue: function(i_in) {
        this.x = i_in.x;
        this.y = i_in.y;
        this.z = i_in.z;
        return;
    }
    ,
    // calculate the distance from the vector of the i_point    
    dist: function(i_point) {
        var x, y, z;
        x = this.x - i_point.x;
        y = this.y - i_point.y;
        z = this.z - i_point.z;
        return Math.sqrt(x * x + y * y + z * z);
    }
});


NyARHistogram = Klass({// It is a class that contains a histogram.    
    data: null, // Storage variable of the sampling values    
    length: 0, // The range of valid sampling value. [0-data.length-1]
    total_of_data: 0, // The total number of valid data sample [i]

    initialize: function(i_length) {
        this.data = new FloatVector(i_length);
        this.length = i_length;
        this.total_of_data = 0;
    }
    ,
    // return the total number of data from the interval to i_ed i_st    
    getTotal: function(i_st, i_ed) {
        NyAS3Utils.assert(i_st < i_ed && i_ed < this.length);
        var result = 0;
        var s = this.data;
        for (var i = i_st; i <= i_ed; i++) {
            result += s[i];
        }
        return result;
    }
    ,
    lowCut: function(i_pos) { // Then to 0 i_pos less than sample that you specify
        var s = 0;
        for (var i = 0; i < i_pos; i++) {
            s += this.data[i];
            this.data[i] = 0;
        }
        this.total_of_data -= s;
    }
    ,
    highCut: function(i_pos) { // Turn 0 of the sample i_pos greater than or equal to the specified.
        var s = 0;
        for (var i = this.length - 1; i >= i_pos; i--) {
            s += this.data[i];
            this.data[i] = 0;
        }
        this.total_of_data -= s;
    }
    ,
    getMinSample: function() { // return the sample number of the minimum value is stored.
        var data = this.data;
        var ret = this.length - 1;
        var min = data[ret];
        for (var i = this.length - 2; i >= 0; i--) {
            if (data[i] < min) {
                min = data[i];
                ret = i;
            }
        }
        return ret;
    }
    ,
    getMinData: function() { // return the value of the smallest of the sample.
        return this.data[this.getMinSample()];
    }
    ,
    getAverage: function() { // calculate the average value.
        var sum = 0;
        for (var i = this.length - 1; i >= 0; i--) {
            sum += this.data[i] * i;
        }
        return toInt(sum / this.total_of_data);
    }

});

NyARIntPoint2d = Klass({
    x: 0,
    y: 0,
    /**
     * 配列ファクトリ
     * @param i_number
     * @return
     */
    createArray: function(i_number)
    {
        var ret = new Array(i_number);
        for (var i = 0; i < i_number; i++)
        {
            ret[i] = new NyARIntPoint2d();
        }
        return ret;
    }
    , copyArray: function(i_from, i_to)
    {
        for (var i = i_from.length - 1; i >= 0; i--)
        {
            i_to[i].x = i_from[i].x;
            i_to[i].y = i_from[i].y;
        }
        return;
    }
});

NyARIntRect = Klass({
    x: 0,
    y: 0,
    w: 0,
    h: 0
});

NyARIntSize = Klass({
    h: 0,
    w: 0,
    //	public function NyARIntSize()
    // 	public function NyARIntSize(i_width,i_height)
    //	public function NyARIntSize(i_ref_object)
    initialize: function() {
        switch (arguments.length) {
            case 0:
                { //public function NyARIntSize()
                    this.w = 0;
                    this.h = 0;
                    return;
                }
            case 1:
                this.w = arguments[0].w;
                this.h = arguments[0].h;
                return;
                break;
            case 2:
                { //public function NyARIntSize(i_ref_object)
                    this.w = toInt(arguments[0]);
                    this.h = toInt(arguments[1]);
                    return;
                }
                break;
            default:
                break;
        }
        throw new NyARException();
    },
    isEqualSize_int: function(i_width, i_height) { // confirm size is either identical.
        if (i_width == this.w && i_height == this.h) {
            return true;
        }
        return false;
    }
    ,
    isEqualSize_NyARIntSize: function(i_size) { // confirm size is either identical.
        if (i_size.w == this.w && i_size.h == this.h) {
            return true;
        }
        return false;
    }
});

// store the parameters: 0=dx*x+dy*y+c 
// increasing direction of x, y and x = L → R, y = B → T
NyARLinear = Klass({
    dx: 0, // increase the amount of dx axis
    dy: 0, // increase the amount of dy-axis
    c: 0, // Section
    createArray: function(i_number) {
        var ret = new Array(i_number);
        for (var i = 0; i < i_number; i++)
        {
            ret[i] = new NyARLinear();
        }
        return ret;
    }
    , copyFrom: function(i_source) {
        this.dx = i_source.dx;
        this.dy = i_source.dy;
        this.c = i_source.c;
        return;
    }
    ,
    crossPos: function(l_line_i, l_line_2, o_point) { // calculate the intersection of two straight lines.
        var w1 = l_line_2.dy * l_line_i.dx - l_line_i.dy * l_line_2.dx;
        if (w1 == 0.0) {
            return false;
        }
        o_point.x = (l_line_2.dx * l_line_i.c - l_line_i.dx * l_line_2.c) / w1;
        o_point.y = (l_line_i.dy * l_line_2.c - l_line_2.dy * l_line_i.c) / w1;
        return true;
    }
});

FLARRasterFilter_Threshold = ASKlass('FLARRasterFilter_Threshold', {// binarization by a constant threshold.
    _threshold: 0,
    _do_threshold_impl: null,
    FLARRasterFilter_Threshold: function(i_threshold) {
    },
    // Threshold for binarizing the image. Will be <bright point <= th scotoma.
    setThreshold: function(i_threshold) {
        this._threshold = i_threshold;
    }
    ,
    doFilter: function(i_input, i_output) {
        NyAS3Utils.assert(i_input._width == i_output._width && i_input._height == i_output._height);
        var out_buf = (i_output.getBuffer());
        var in_reader = i_input.getRgbPixelReader();
        var d = in_reader.getData().data;
        var obd = out_buf.data;
        var th3 = this._threshold * 10000;
        for (var i = 0, j = 0; i < d.length; i += 4, ++j) {
            var c = d[i] * 2989 + d[i + 1] * 5866 + d[i + 2] * 1145;
            var t = (c <= th3) ? 0xffffffff : 0xff000000;
            obd[j] = t;
        }
        if (window.DEBUG) {
            var debugCanvas = document.getElementById('debugCanvas');
            out_buf.drawOnCanvas(debugCanvas);
        }
        return;
    }
});

Point = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
};

NyARLabelInfo = ASKlass('NyARLabelInfo', {
    area: 0,
    clip_r: 0,
    clip_l: 0,
    clip_b: 0,
    clip_t: 0,
    pos_x: 0,
    pos_y: 0,
    NyARLabelInfo: function() {
    }
});

NyARLabelInfoStack = ASKlass('NyARLabelInfoStack', {
    _items: null,
    _length: 0,
    NyARLabelInfoStack: function(i_length) {
        this._items = this.createArray(i_length); // Partitioning        
        this._length = 0; // Reset busy number
        return;
    }
    ,
    createArray: function(i_length) {
        var ret = new Array(i_length);
        for (var i = 0; i < i_length; i++) {
            ret[i] = new NyARLabelInfo();
        }
        return (ret);
    }
    ,
    sortByArea: function() { // sort the label in descending order of area.
        var len = this._length;
        if (len < 1) {
            return;
        }
        var h = Math.floor(len * 13 / 10);
        var item = this._items;
        for (; ; ) {
            var swaps = 0;
            for (var i = 0; i + h < len; i++) {
                if (item[i + h].area > item[i].area) {
                    var temp = item[i + h];
                    item[i + h] = item[i];
                    item[i] = temp;
                    swaps++;
                }
            }
            if (h == 1) {
                if (swaps == 0) {
                    break;
                }
            } else {
                h = Math.floor(h * 10 / 13);
            }
        }
    }
    ,
    prePush: function() { // reserve the new area. (return Null if fails)

        if (this._length >= this._items.length) { // Allocated as needed
            return null;
        }
        // To +1 space used, and return the space reservation.
        var ret = this._items[this._length];
        this._length++;
        return ret;
    }
    ,
    // @param i_reserv_length = Size to the used 
    init: function(i_reserv_length) { // initialize the stack
        // Allocated as needed
        if (i_reserv_length >= this._items.length) {
            throw new NyARException();
        }
        this._length = i_reserv_length;
    }
    ,
    pop: function() { // reduce the number of elements one of apparent. returns the object (valid until the next push)
        NyAS3Utils.assert(this._length >= 1);
        this._length--;
        return this._items[this._length];
    }
    ,
    pops: function(i_count) { // reduce i_count individual the number of elements of apparent. 
        NyAS3Utils.assert(this._length >= i_count);
        this._length -= i_count;
        return;
    }
    , getArray: function() { //array return
        return this._items;
    }
    ,
    getItem: function(i_index) {
        return this._items[i_index];
    }
    ,
    getLength: function() { // return the number of elements in the array apparent
        return this._length;
    }
    ,
    clear: function() { // reset the number of elements of apparent
        this._length = 0;
    }
});

NyARLabelOverlapChecker = ASKlass('NyARLabelOverlapChecker', {
    _labels: null,
    _length: 0,
    NyARLabelOverlapChecker: function(i_max_label) {
        this._labels = this.createArray(i_max_label);
    }
    ,
    createArray: function(i_length) {
        return new Array(i_length);
    }
    ,
    push: function(i_label_ref) { // add a label to be checked.
        this._labels[this._length] = i_label_ref;
        this._length++;
    }
    ,
    check: function(i_label) { // Returns if overlaps with the label on the current list
        // processing overlap?
        var label_pt = this._labels;
        var px1 = toInt(i_label.pos_x);
        var py1 = toInt(i_label.pos_y);
        for (var i = this._length - 1; i >= 0; i--) {
            var px2 = toInt(label_pt[i].pos_x);
            var py2 = toInt(label_pt[i].pos_y);
            var d = (px1 - px2) * (px1 - px2) + (py1 - py2) * (py1 - py2);
            if (d < label_pt[i].area / 4) {
                return false; // Excluded
            }
        }
        return true; // Target
    }
    ,
    setMaxLabels: function(i_max_label) { //Reset object to accumulate the largest label i_max_label individual
        if (i_max_label > this._labels.length) {
            this._labels = this.createArray(i_max_label);
        }
        this._length = 0;
    }
});

NyARLabeling_Rle = ASKlass('NyARLabeling_Rle', {// labeling RleImage
    AR_AREA_MAX: 100000, // #define AR_AREA_MAX 100000
    AR_AREA_MIN: 70, // #define AR_AREA_MIN 70
    _rlestack: null,
    _rle1: null,
    _rle2: null,
    _max_area: 0,
    _min_area: 0,
    NyARLabeling_Rle: function(i_width, i_height) {
        this._rlestack = new RleInfoStack(i_width * i_height * 2048 / (320 * 240) + 32);
        this._rle1 = RleElement.createArray(i_width / 2 + 1);
        this._rle2 = RleElement.createArray(i_width / 2 + 1);
        this.setAreaRange(this.AR_AREA_MAX, this.AR_AREA_MIN);
        return;
    }
    ,
    setAreaRange: function(i_max, i_min) { // Target size
        this._max_area = i_max;
        this._min_area = i_min;
        return;
    }
    ,
    // RLE compress the image of gs i_bin_buf
    // threshold at the time of 0, GS raster when the BIN raster    
    // Scotoma <= th < bright point
    toRLE: function(i_bin_buf, i_st, i_len, i_out, i_th) { // function recognized as a dark point threshold
        var current = 0;
        var lidx = 0, ridx = 1, fidx = 2, off = 3;
        var r = -1;
        // Line fixed start
        var x = i_st;
        var right_edge = i_st + i_len - 1;
        while (x < right_edge) {
            // Scotoma (0) scan
            if (i_bin_buf[x] != 0xffffffff) {
                x++;//Bright point
                continue;
            }
            // examine the point length dark → discovery of dark spots
            r = (x - i_st);
            i_out[current + lidx] = r;
            r++; // +1 Scotoma
            x++;
            while (x < right_edge) {
                if (i_bin_buf[x] != 0xffffffff) {
                    // Point dark bright point (1) → (0) array end> registration
                    i_out[current + ridx] = r;
                    current += off;
                    x++; // Confirmation of the runner-up.
                    r = -1; // 0 to the position of the right edge.
                    break;

                } else { // Scotoma (0) additional length                    
                    r++;
                    x++;
                }
            }
        }
        // Judgment approach is slightly different only one point in the last
        if (i_bin_buf[x] != 0xffffffff) {
            // Registration>-terminated array of dark spots if bright point → r count in
            if (r >= 0) {
                i_out[current + ridx] = r;
                current += off;
            }
        } else {
            // Add l1 if not in → count scotoma
            if (r >= 0) {
                i_out[current + ridx] = (r + 1);
            } else {
                // In the case of one point of the last
                i_out[current + lidx] = (i_len - 1);
                i_out[current + ridx] = (i_len);
            }
            current += off;
        }
        return current / off; // Fixed line
    }
    ,
    addFragment: function(i_rel_img, i_img_idx, i_nof, i_row_index, o_stack) {
        var lidx = 0, ridx = 1, fidx = 2, off = 3;
        var l = i_rel_img[i_img_idx + lidx];
        var r = i_rel_img[i_img_idx + ridx];
        var len = r - l;
        i_rel_img[i_img_idx + fidx] = i_nof; // unique ID of each REL
        var v = o_stack.prePush();
        v.entry_x = l;
        v.area = len;
        v.clip_l = l;
        v.clip_r = r - 1;
        v.clip_t = i_row_index;
        v.clip_b = i_row_index;
        v.pos_x = (len * (2 * l + (len - 1))) / 2;
        v.pos_y = i_row_index * len;
        return;
    }
    ,
    // try to also prepare low-speed system while converting to BIN-RLE raster from the desired
    // The labeling while converted into BIN raster GS raster using a single threshold
    labeling_NyARBinRaster: function(i_bin_raster, i_top, i_bottom, o_stack) {
        NyAS3Utils.assert(i_bin_raster.isEqualBufferType(NyARBufferType.INT1D_BIN_8));
        return this.imple_labeling(i_bin_raster, 0, i_top, i_bottom, o_stack);
    }
    ,
    // @param i_th = Threshold for binarizing the image. Will be <bright point <= th scotoma     
    labeling_NyARGrayscaleRaster: function(i_gs_raster, i_th, i_top, i_bottom, o_stack) { // label the BIN raster
        NyAS3Utils.assert(i_gs_raster.isEqualBufferType(NyARBufferType.INT1D_GRAY_8));
        return this.imple_labeling(i_gs_raster, i_th, i_top, i_bottom, o_stack);
    }
    ,
    labeling: function(i_bin_raster, o_stack) {
        return this.imple_labeling(i_bin_raster, 0, 0, i_bin_raster.getHeight(), o_stack);
    }
    ,
    imple_labeling: function(i_raster, i_th, i_top, i_bottom, o_stack) {
        // Reset process
        var rlestack = this._rlestack;
        rlestack.clear();

        var rle_prev = this._rle1;
        var rle_current = this._rle2;
        var len_prev = 0;
        var len_current = 0;
        var width = i_raster.getWidth();
        var in_buf = (i_raster.getBuffer().data);
        var id_max = 0;
        var label_count = 0;
        var lidx = 0, ridx = 1, fidx = 2, off = 3;
        // The first-stage registration
        len_prev = this.toRLE(in_buf, i_top, width, rle_prev, i_th);
        var i;
        for (i = 0; i < len_prev; i++) {
            // Fragment fragment ID = initial value, POS = Y value, REL index = line
            this.addFragment(rle_prev, i * off, id_max, i_top, rlestack);
            id_max++;
            label_count++; // maximum value check
        }
        var f_array = (rlestack.getArray());
        // Join the next stage
        for (var y = i_top + 1; y < i_bottom; y++) {
            // Read the current line
            len_current = this.toRLE(in_buf, y * width, width, rle_current, i_th);
            var index_prev = 0;
            SCAN_CUR: for (i = 0; i < len_current; i++) {
                // adjust the position index_prev, of len_prev
                var id = -1;
                SCAN_PREV: while (index_prev < len_prev) { // Check if there is a prev to be checked
                    if (rle_current[i * off + lidx] - rle_prev[index_prev * off + ridx] > 0) { //8 orientation labeling if 0
                        // located to the left of the cur prev → Explore the next fragment
                        index_prev++;
                        continue;
                    } else if (rle_prev[index_prev * off + lidx] - rle_current[i * off + ridx] > 0) { //8 orientation labeling if 0
                        // cur in the rightward prev → Independent fragment
                        this.addFragment(rle_current, i * off, id_max, y, rlestack);
                        id_max++;
                        label_count++;
                        // examine the index of the next
                        continue SCAN_CUR;
                    }
                    id = rle_prev[index_prev * off + fidx];// Root fragment id
                    var id_ptr = f_array[id];
                    //Binding partner (first time) -> Copy prev ID, and update root fragment information
                    rle_current[i * off + fidx] = id; // Save ID fragment
                    //
                    var l = rle_current[i * off + lidx];
                    var r = rle_current[i * off + ridx];
                    var len = r - l;
                    id_ptr.area += len; // update binding target fragment information

                    // entry_x t and does not update it because it uses the binding of destination.
                    id_ptr.clip_l = l < id_ptr.clip_l ? l : id_ptr.clip_l;
                    id_ptr.clip_r = r > id_ptr.clip_r ? r - 1 : id_ptr.clip_r;
                    id_ptr.clip_b = y;
                    id_ptr.pos_x += (len * (2 * l + (len - 1))) / 2;
                    id_ptr.pos_y += y * len;
                    // Confirmation of multiple bonds (second and subsequent)
                    index_prev++;
                    while (index_prev < len_prev) {
                        if (rle_current[i * off + lidx] - rle_prev[index_prev * off + ridx] > 0) { // 8 orientation labeling if 0
                            // located to the left of the cur prev → prev not linked to cur
                            break SCAN_PREV;
                        } else if (rle_prev[index_prev * off + lidx] - rle_current[i * off + ridx] > 0) { // It is 8 orientation labeling if 0
                            // located to the right of the cur is prev → prev not linked to cur.
                            index_prev--;
                            continue SCAN_CUR;
                        }
                        // cur prev and are linked → Integration of root fragments
                        // Get the root fragments that bind
                        var prev_id = rle_prev[index_prev * off + fidx];
                        var prev_ptr = f_array[prev_id];
                        if (id != prev_id) {
                            label_count--;
                            // rewrite the fragment id of current and prev.
                            var i2;
                            for (i2 = index_prev; i2 < len_prev; i2++) {
                                // prev until the end of the current id of
                                if (rle_prev[i2 * off + fidx] == prev_id) {
                                    rle_prev[i2 * off + fidx] = id;
                                }
                            }
                            for (i2 = 0; i2 < i; i2++) {
                                // current until now -1 from 0
                                if (rle_current[i2 * off + fidx] == prev_id) {
                                    rle_current[i2 * off + fidx] = id;
                                }
                            }
                            // The aggregate information to route the current fragment
                            id_ptr.area += prev_ptr.area;
                            id_ptr.pos_x += prev_ptr.pos_x;
                            id_ptr.pos_y += prev_ptr.pos_y;
                            //tとentry_xの決定
                            if (id_ptr.clip_t > prev_ptr.clip_t) {
                                // The underlying direction of the current.
                                id_ptr.clip_t = prev_ptr.clip_t;
                                id_ptr.entry_x = prev_ptr.entry_x;
                            } else if (id_ptr.clip_t < prev_ptr.clip_t) {
                                // Are on the person of the current. Feedback to prev
                            } else {
                                // Smaller entry point in the horizontal direction.
                                if (id_ptr.entry_x > prev_ptr.entry_x) {
                                    id_ptr.entry_x = prev_ptr.entry_x;
                                } else {
                                }
                            }
                            // determination of l
                            if (id_ptr.clip_l > prev_ptr.clip_l) {
                                id_ptr.clip_l = prev_ptr.clip_l;
                            } else {
                            }
                            // determination of r
                            if (id_ptr.clip_r < prev_ptr.clip_r) {
                                id_ptr.clip_r = prev_ptr.clip_r;
                            } else {
                            }
                            // determination of b
                            // I want to disable the root fragment of the binding already.
                            prev_ptr.area = 0;
                        }
                        index_prev++;
                    }
                    index_prev--;
                    break;
                }
                // Check whether id is assigned to the cur
                // Add the right edge independent fragment
                if (id < 0) {
                    this.addFragment(rle_current, i * off, id_max, y, rlestack);
                    id_max++;
                    label_count++;
                }
            }
            // exchange of prev and rel
            var tmp = rle_prev;
            rle_prev = rle_current;
            len_prev = len_current;
            rle_current = tmp;
        }
        // Transfer only the label of the target
        o_stack.init(label_count);
        var o_dest_array = (o_stack.getArray());
        var max = this._max_area;
        var min = this._min_area;
        var active_labels = 0;
        for (i = id_max - 1; i >= 0; i--) {
            var area = f_array[i].area;
            if (area < min || area > max) { // I also shed in the area 0 min of non-target
                continue;
            }

            var src_info = f_array[i];
            var dest_info = o_dest_array[active_labels];
            dest_info.area = area;
            dest_info.clip_b = src_info.clip_b;
            dest_info.clip_r = src_info.clip_r;
            dest_info.clip_t = src_info.clip_t;
            dest_info.clip_l = src_info.clip_l;
            dest_info.entry_x = src_info.entry_x;
            dest_info.pos_x = src_info.pos_x / src_info.area;
            dest_info.pos_y = src_info.pos_y / src_info.area;
            active_labels++;
        }
        // Re-set the number of labels
        o_stack.pops(label_count - active_labels);
        // To return the number of labels
        return active_labels;
    }
});

RleInfo = ASKlass('RleInfo', {
    // Inherited members
    entry_x: 0, // Position of the fragment label
    area: 0,
    clip_r: 0,
    clip_l: 0,
    clip_b: 0,
    clip_t: 0,
    pos_x: 0,
    pos_y: 0
});

RleInfoStack = ASKlass('RleInfoStack', NyARObjectStack, {
    RleInfoStack: function(i_length) {
        NyARObjectStack.initialize.call(this, i_length);
        return;
    }
    ,
    createArray: function(i_length) {
        var ret = new Array(toInt(i_length));
        for (var i = 0; i < i_length; i++) {
            ret[i] = new RleInfo();
        }
        return ret;
    }
});

RleElement = ASKlass('RleElement', {
    l: 0,
    r: 0,
    fid: 0,
    createArray: function(i_length) {
        return new IntVector(toInt(i_length) * 3);
        var ret = new Array(toInt(i_length));
        for (var i = 0; i < i_length; i++) {
            ret[i] = new RleElement();
        }
        return ret;
    }
});

NyARRleLabelFragmentInfo = ASKlass('NyARRleLabelFragmentInfo', NyARLabelInfo, {
    // Inherited members
    // int area; // Number of regions of the fragment label
    entry_x: 0 // Position of the fragment label
});

NyARRleLabelFragmentInfoStack = ASKlass('NyARRleLabelFragmentInfoStack', NyARLabelInfoStack, {
    NyARRleLabelFragmentInfoStack: function(i_length) {
        NyARLabelInfoStack.initialize.call(this, i_length);
        return;
    }
    , createArray: function(i_length) {
        var ret = new Array(toInt(i_length));
        for (var i = 0; i < i_length; i++) {
            ret[i] = new NyARRleLabelFragmentInfo();
        }
        return (ret);
    }
});

INyARCameraDistortionFactor = ASKlass('INyARCameraDistortionFactor', {
    ideal2Observ: function(i_in, o_out) {
    },
    ideal2ObservBatch: function(i_in, o_out, i_size) {
    },
    observ2Ideal: function(ix, iy, o_point) {
    },
    observ2IdealBatch: function(i_x_coord, i_y_coord, i_start, i_num, o_x_coord, o_y_coord) {
    }
});

// The class that contains the distortion component of the camera, the correction function group
// http://www.hitl.washington.edu/artoolkit/Papers/ART02-Tutorial.pdf, page 11
NyARCameraDistortionFactor = ASKlass('NyARCameraDistortionFactor', INyARCameraDistortionFactor, {
    PD_LOOP: 3,
    _f0: 0, //x0
    _f1: 0, //y0
    _f2: 0, //100000000.0*ｆ
    _f3: 0 //s
    ,
    copyFrom: function(i_ref) {
        this._f0 = i_ref._f0;
        this._f1 = i_ref._f1;
        this._f2 = i_ref._f2;
        this._f3 = i_ref._f3;
        return;
    }
    ,
    // @param i_factor = Array of four or more elements
    setValue: function(i_factor) { // set as a factor the value of the array.
        this._f0 = i_factor[0];
        this._f1 = i_factor[1];
        this._f2 = i_factor[2];
        this._f3 = i_factor[3];
        return;
    }
    ,
    getValue: function(o_factor) {
        o_factor[0] = this._f0;
        o_factor[1] = this._f1;
        o_factor[2] = this._f2;
        o_factor[3] = this._f3;
        return;
    }
    ,
    changeScale: function(i_scale) {
        this._f0 = this._f0 * i_scale; // newparam->dist_factor[0] =source->dist_factor[0] *scale;
        this._f1 = this._f1 * i_scale; // newparam->dist_factor[1] =source->dist_factor[1] *scale;
        this._f2 = this._f2 / (i_scale * i_scale); // newparam->dist_factor[2]=source->dist_factor[2]/ (scale*scale);
        //this.f3=this.f3;// newparam->dist_factor[3] =source->dist_factor[3];
        return;
    }
    ,
    // int arParamIdeal2Observ( const double dist_factor[4], const double ix,const double iy,double *ox, double *oy ) (Alternate function of function)
    ideal2Observ: function(i_in, o_out) {
        var x = (i_in.x - this._f0) * this._f3;
        var y = (i_in.y - this._f1) * this._f3;
        if (x == 0.0 && y == 0.0) {
            o_out.x = this._f0;
            o_out.y = this._f1;
        } else {
            var d = 1.0 - this._f2 / 100000000.0 * (x * x + y * y);
            o_out.x = x * d + this._f0;
            o_out.y = y * d + this._f1;
        }
        return;
    }
    ,
    // This is done by collectively ideal2Observ.
    ideal2ObservBatch: function(i_in, o_out, i_size) {
        var x, y;
        var d0 = this._f0;
        var d1 = this._f1;
        var d3 = this._f3;
        var d2_w = this._f2 / 100000000.0;
        for (var i = 0; i < i_size; i++) {
            x = (i_in[i].x - d0) * d3;
            y = (i_in[i].y - d1) * d3;
            if (x == 0.0 && y == 0.0) {
                o_out[i].x = d0;
                o_out[i].y = d1;
            } else {
                var d = 1.0 - d2_w * (x * x + y * y);
                o_out[i].x = x * d + d0;
                o_out[i].y = y * d + d1;
            }
        }
        return;
    }
    ,
    // int arParamObserv2Ideal( const double dist_factor[4], const double ox,const double oy,double *ix, double *iy );
    observ2Ideal: function(ix, iy, o_point) {
        var z02, z0, p, q, z, px, py, opttmp_1;
        var d0 = this._f0;
        var d1 = this._f1;
        px = ix - d0;
        py = iy - d1;
        p = this._f2 / 100000000.0;
        z02 = px * px + py * py;
        q = z0 = Math.sqrt(z02); // Optimize
        for (var i = 1; ; i++) {
            if (z0 != 0.0) {
                // Optimize opttmp_1
                opttmp_1 = p * z02;
                z = z0 - ((1.0 - opttmp_1) * z0 - q) / (1.0 - 3.0 * opttmp_1);
                px = px * z / z0;
                py = py * z / z0;
            } else {
                px = 0.0;
                py = 0.0;
                break;
            }
            if (i == this.PD_LOOP) {
                break;
            }
            z02 = px * px + py * py;
            z0 = Math.sqrt(z02); // Optimize
        }
        o_point.x = px / this._f3 + d0;
        o_point.y = py / this._f3 + d1;
        return;
    }
    ,
    // Run together observ2Ideal of the specified range, and stores the results in o_ideal
    // @param i_start = coord starting point
    // @param i_num = Number of calculations
    // @param o_ideal 0 Output buffer [i_num] that it is a [2].
    observ2IdealBatch: function(i_x_coord, i_y_coord, i_start, i_num, o_x_coord, o_y_coord) {
        var z02, z0, q, z, px, py, opttmp_1;
        var d0 = this._f0;
        var d1 = this._f1;
        var d3 = this._f3;
        var p = this._f2 / 100000000.0;
        for (var j = 0; j < i_num; j++) {
            px = i_x_coord[i_start + j] - d0;
            py = i_y_coord[i_start + j] - d1;
            z02 = px * px + py * py;
            q = z0 = Math.sqrt(z02); // Optimize//q = z0 = Math.sqrt(px*px+py*py);
            for (var i = 1; ; i++) {
                if (z0 != 0.0) {
                    // Optimize opttmp_1
                    opttmp_1 = p * z02;
                    z = z0 - ((1.0 - opttmp_1) * z0 - q) / (1.0 - 3.0 * opttmp_1);
                    px = px * z / z0;
                    py = py * z / z0;
                } else {
                    px = 0.0;
                    py = 0.0;
                    break;
                }
                if (i == PD_LOOP) {
                    break;
                }
                z02 = px * px + py * py;
                z0 = Math.sqrt(z02); // Optimize //z0 = Math.sqrt(px*px+ py*py);
            }
            o_x_coord[j] = px / d3 + d0;
            o_y_coord[j] = py / d3 + d1;
        }
        return;
    }
});

NyARObserv2IdealMap = ASKlass('NyARObserv2IdealMap', {
    _stride: 0,
    _mapx: null,
    _mapy: null,
    NyARObserv2IdealMap: function(i_distfactor, i_screen_size) {
        var opoint = new NyARDoublePoint2d();
        this._mapx = new FloatVector(i_screen_size.w * i_screen_size.h);
        this._mapy = new FloatVector(i_screen_size.w * i_screen_size.h);
        this._stride = i_screen_size.w;
        var ptr = i_screen_size.h * i_screen_size.w - 1;
        // Build a distortion map
        for (var i = i_screen_size.h - 1; i >= 0; i--) {
            for (var i2 = i_screen_size.w - 1; i2 >= 0; i2--) {
                i_distfactor.observ2Ideal(i2, i, opoint);
                this._mapx[ptr] = opoint.x;
                this._mapy[ptr] = opoint.y;
                ptr--;
            }
        }
        return;
    }
    ,
    observ2Ideal: function(ix, iy, o_point) {
        var idx = ix + iy * this._stride;
        o_point.x = this._mapx[idx];
        o_point.y = this._mapy[idx];
        return;
    }
    ,
    observ2IdealBatch: function(i_x_coord, i_y_coord, i_start, i_num, o_x_coord, o_y_coord, i_out_start_index) {
        var idx;
        var ptr = i_out_start_index;
        var mapx = this._mapx;
        var mapy = this._mapy;
        var stride = this._stride;
        for (var j = 0; j < i_num; j++) {
            idx = i_x_coord[i_start + j] + i_y_coord[i_start + j] * stride;
            o_x_coord[ptr] = mapx[idx];
            o_y_coord[ptr] = mapy[idx];
            ptr++;
        }
        return;
    }
});

NyARPerspectiveProjectionMatrix = ASKlass('NyARPerspectiveProjectionMatrix', NyARDoubleMatrix34, {
    // static double dot( double a1, double a2, double a3,double b1, double b2,double b3 )
    dot: function(a1, a2, a3, b1, b2, b3) {
        return (a1 * b1 + a2 * b2 + a3 * b3);
    },
    // static double norm( double a, double b, double c )     
    norm: function(a, b, c) {
        return Math.sqrt(a * a + b * b + c * c);
    }
    ,
    // int arParamDecompMat( double source[3][4], double cpara[3][4], double trans[3][4] ); Replacing the function. Optimize STEP[754->665]
    // @param o_cpara = return argument. To specify a matrix of 3x4.
    // @param o_trans = return argument. To specify a matrix of 3x4.
    decompMat: function(o_cpara, o_trans) {
        var r, c;
        var rem1, rem2, rem3;
        var c00, c01, c02, c03, c10, c11, c12, c13, c20, c21, c22, c23;
        if (this.m23 >= 0) { // if( source[2][3] >= 0 ) {
            c00 = this.m00;
            c01 = this.m01;
            c02 = this.m02;
            c03 = this.m03;
            c10 = this.m10;
            c11 = this.m11;
            c12 = this.m12;
            c13 = this.m13;
            c20 = this.m20;
            c21 = this.m21;
            c22 = this.m22;
            c23 = this.m23;
        } else {
            c00 = -this.m00;
            c01 = -this.m01;
            c02 = -this.m02;
            c03 = -this.m03;
            c10 = -this.m10;
            c11 = -this.m11;
            c12 = -this.m12;
            c13 = -this.m13;
            c20 = -this.m20;
            c21 = -this.m21;
            c22 = -this.m22;
            c23 = -this.m23;
        }
        var cpara = o_cpara.getArray();
        var trans = o_trans.getArray();
        for (r = 0; r < 3; r++) {
            for (c = 0; c < 4; c++) {
                cpara[r][c] = 0.0;
            }
        }
        cpara[2][2] = this.norm(c20, c21, c22);
        trans[2][0] = c20 / cpara[2][2];
        trans[2][1] = c21 / cpara[2][2];
        trans[2][2] = c22 / cpara[2][2];
        trans[2][3] = c23 / cpara[2][2];
        cpara[1][2] = this.dot(trans[2][0], trans[2][1], trans[2][2], c10, c11, c12);
        rem1 = c10 - cpara[1][2] * trans[2][0];
        rem2 = c11 - cpara[1][2] * trans[2][1];
        rem3 = c12 - cpara[1][2] * trans[2][2];
        cpara[1][1] = this.norm(rem1, rem2, rem3);
        trans[1][0] = rem1 / cpara[1][1];
        trans[1][1] = rem2 / cpara[1][1];
        trans[1][2] = rem3 / cpara[1][1];
        cpara[0][2] = this.dot(trans[2][0], trans[2][1], trans[2][2], c00, c01, c02);
        cpara[0][1] = this.dot(trans[1][0], trans[1][1], trans[1][2], c00, c01, c02);
        rem1 = c00 - cpara[0][1] * trans[1][0] - cpara[0][2] * trans[2][0];
        rem2 = c01 - cpara[0][1] * trans[1][1] - cpara[0][2] * trans[2][1];
        rem3 = c02 - cpara[0][1] * trans[1][2] - cpara[0][2] * trans[2][2];
        cpara[0][0] = this.norm(rem1, rem2, rem3);
        trans[0][0] = rem1 / cpara[0][0];
        trans[0][1] = rem2 / cpara[0][0];
        trans[0][2] = rem3 / cpara[0][0];
        trans[1][3] = (c13 - cpara[1][2] * trans[2][3]) / cpara[1][1];
        trans[0][3] = (c03 - cpara[0][1] * trans[1][3] - cpara[0][2] * trans[2][3]) / cpara[0][0];
        for (r = 0; r < 3; r++) {
            for (c = 0; c < 3; c++) {
                cpara[r][c] /= cpara[2][2];
            }
        }
        return;
    }
    ,
    // int arParamChangeSize( ARParam *source, int xsize, int ysize, ARParam *newparam );
    // convert the scale of the Matrix.
    changeScale: function(i_scale) {
        this.m00 = this.m00 * i_scale;
        this.m10 = this.m10 * i_scale;
        this.m01 = this.m01 * i_scale;
        this.m11 = this.m11 * i_scale;
        this.m02 = this.m02 * i_scale;
        this.m12 = this.m12 * i_scale;
        this.m03 = this.m03 * i_scale;
        this.m13 = this.m13 * i_scale;
        return;
    }
    // projective transformation the three-dimensional coordinates in the current matrix.
    ,
    projectionConvert_NyARDoublePoint3d: function(i_3dvertex, o_2d) {
        var w = i_3dvertex.z * this.m22;
        o_2d.x = (i_3dvertex.x * this.m00 + i_3dvertex.y * this.m01 + i_3dvertex.z * this.m02) / w;
        o_2d.y = (i_3dvertex.y * this.m11 + i_3dvertex.z * this.m12) / w;
        return;
    }
    ,
    projectionConvert_Number: function(i_x, i_y, i_z, o_2d) {
        var w = i_z * this.m22;
        o_2d.x = (i_x * this.m00 + i_y * this.m01 + i_z * this.m02) / w;
        o_2d.y = (i_y * this.m11 + i_z * this.m12) / w;
        return;
    }
});

// typedef struct { int xsize, ysize; double mat[3][4]; double dist_factor[4]; } ARParam;
NyARParam = ASKlass('NyARParam', {// Class that contains the operating parameters of NyAR
    _screen_size: new NyARIntSize(),
    SIZE_OF_PARAM_SET: 4 + 4 + (3 * 4 * 8) + (4 * 8),
    _dist: new NyARCameraDistortionFactor(),
    _projection_matrix: new NyARPerspectiveProjectionMatrix(),
    getScreenSize: function() {
        return this._screen_size;
    },
    getPerspectiveProjectionMatrix: function() {
        return this._projection_matrix;
    },
    getDistortionFactor: function() {
        return this._dist;
    },
    // Copy the perspective projection matrix to the given m_projection FloatVector GL camera matrix.
    copyCameraMatrix: function(m_projection, NEAR_CLIP, FAR_CLIP) {
        var trans_mat = new FLARMat(3, 4);
        var icpara_mat = new FLARMat(3, 4);
        var p = ArrayUtil.createJaggedArray(3, 3);
        var q = ArrayUtil.createJaggedArray(4, 4);
        var i = 0;
        var j = 0;
        var size = this.getScreenSize();
        var width = size.w;
        var height = size.h;

        this.getPerspectiveProjectionMatrix().decompMat(icpara_mat, trans_mat);

        var icpara = icpara_mat.getArray();
        var trans = trans_mat.getArray();
        for (i = 0; i < 4; i++) {
            icpara[1][i] = (height - 1) * (icpara[2][i]) - icpara[1][i];
        }

        for (i = 0; i < 3; i++) {
            for (j = 0; j < 3; j++) {
                p[i][j] = icpara[i][j] / icpara[2][2];
            }
        }
        q[0][0] = (2.0 * p[0][0] / (width - 1));
        q[0][1] = (2.0 * p[0][1] / (width - 1));
        q[0][2] = -((2.0 * p[0][2] / (width - 1)) - 1.0);
        q[0][3] = 0.0;

        q[1][0] = 0.0;
        q[1][1] = -(2.0 * p[1][1] / (height - 1));
        q[1][2] = -((2.0 * p[1][2] / (height - 1)) - 1.0);
        q[1][3] = 0.0;

        q[2][0] = 0.0;
        q[2][1] = 0.0;
        q[2][2] = -(FAR_CLIP + NEAR_CLIP) / (NEAR_CLIP - FAR_CLIP);
        q[2][3] = 2.0 * FAR_CLIP * NEAR_CLIP / (NEAR_CLIP - FAR_CLIP);

        q[3][0] = 0.0;
        q[3][1] = 0.0;
        q[3][2] = 1.0;
        q[3][3] = 0.0;

        for (i = 0; i < 4; i++) { // Row.
            // First 3 columns of the current row.
            for (j = 0; j < 3; j++) { // Column.
                m_projection[j * 4 + i] =
                        q[i][0] * trans[0][j] +
                        q[i][1] * trans[1][j] +
                        q[i][2] * trans[2][j];
            }
            // Fourth column of the current row.
            m_projection[i + 4 * 3] =
                    q[i][0] * trans[0][3] +
                    q[i][1] * trans[1][3] +
                    q[i][2] * trans[2][3] +
                    q[i][3];
        }
    }
    ,
    // @param i_factor = sequence set to NyARCameraDistortionFactor. That the number of elements is 4.
    // @param i_projection = sequence that NyARPerspectiveProjectionMatrix set. That the number of elements is 12.
    setValue: function(i_factor, i_projection) {
        this._dist.setValue(i_factor);
        this._projection_matrix.setValue(i_projection);
        return;
    }
    ,
    // int arParamChangeSize( ARParam *source, int xsize, int ysize, ARParam *newparam );
    // change i_xsize, to i_ysize an alternative function of the size property function
    changeScreenSize: function(i_xsize, i_ysize) {
        var scale = i_xsize / this._screen_size.w;// scale = (double)xsize / (double)(source->xsize);
        // Change the scale
        this._dist.changeScale(scale);
        this._projection_matrix.changeScale(scale);
        this._screen_size.w = i_xsize; // newparam->xsize = xsize;
        this._screen_size.h = i_ysize; // newparam->ysize = ysize;
        return;
    }
    ,
    loadARParam: function(i_stream) {
        var tmp = new FloatVector(12); //new double[12];
        i_stream.endian = Endian.BIG_ENDIAN;
        this._screen_size.w = i_stream.readInt(); //bb.getInt();
        this._screen_size.h = i_stream.readInt(); //bb.getInt();
        // read 12 double value
        var i;
        for (i = 0; i < 12; i++) {
            tmp[i] = i_stream.readDouble(); //bb.getDouble();
        }
        // Set Projection to object
        this._projection_matrix.setValue(tmp);
        // I read four double value
        for (i = 0; i < 4; i++) {
            tmp[i] = i_stream.readDouble(); //bb.getDouble();
        }
        // The object set to Factor
        this._dist.setValue(tmp);
        return;
    }
});

FLARParam = ASKlass('FLARParam', NyARParam, {
    FLARParam: function(w, h) {

        w = w || 640;
        h = h || 480;

        this._screen_size.w = w;
        this._screen_size.h = h;

        var f = 1;
        var dist = new FloatVector([w / 2, 1.1 * h / 2, 26.2, 1.0127565206658486]);

        var projection = new FloatVector([
            f * 700.9514702992245, 0, w / 2 - 0.5, 0,
            0, 726.0941816535367, h / 2 - 0.5, 0,
            0, 0, 1, 0
        ]);

        this.setValue(dist, projection);
    }
});

INyARRaster = ASKlass('INyARRaster', {
    getWidth: function() {
    },
    getHeight: function() {
    },
    getSize: function() {
    },
    getBuffer: function() { // return the buffer object.
    },
    getBufferType: function() { // return the type of the buffer object.
    },
    isEqualBufferType: function(i_type_value) { //check buffer is either i_type_value, defined in NyARBufferType
    },
    hasBuffer: function() { //boolean getBuffer
    },
    // wrap the i_ref_buf. Performs a consistency check as much as possible
    // Only possible function, re-wrapping of the buffer please implement this function
    wrapBuffer: function(i_ref_buf) {
    }
});

NyARRaster_BasicClass = ASKlass('NyARRaster_BasicClass', INyARRaster, {
    _size: null,
    _buffer_type: 0,
    NyARRaster_BasicClass: function() { // function(int i_width,int i_height,int i_buffer_type)
        switch (arguments.length) {
            case 1:
                if (arguments[0] == NyAS3Const_Inherited) {
                    //blank
                }
                break;

            case 3:
                this.overload_NyARRaster_BasicClass(toInt(arguments[0]), toInt(arguments[1]), toInt(arguments[2]));
                break;

            default:
                throw new NyARException();
        }
    },
    overload_NyARRaster_BasicClass: function(i_width, i_height, i_buffer_type) {
        this._size = new NyARIntSize(i_width, i_height);
        this._buffer_type = i_buffer_type;
    },
    getWidth: function() {
        return this._size.w;
    },
    getHeight: function() {
        return this._size.h;
    },
    getSize: function() {
        return this._size;
    },
    getBufferType: function() {
        return this._buffer_type;
    },
    isEqualBufferType: function(i_type_value) {
        return this._buffer_type == i_type_value;
    },
    getBuffer: function() {
        throw new NyARException();
    },
    hasBuffer: function() {
        throw new NyARException();
    },
    wrapBuffer: function(i_ref_buf) {
        throw new NyARException();
    }
});

NyARBinRaster = ASKlass('NyARBinRaster', NyARRaster_BasicClass, {
    _buf: null,
    _is_attached_buffer: null, // Buffer true if the object is attached

    NyARBinRaster: function() {
        NyARRaster_BasicClass.initialize.call(this, NyAS3Const_Inherited);
        switch (arguments.length) {
            case 1:
                if (arguments[0] == NyAS3Const_Inherited) {
                    //blank
                }
                break;
            case 2: //(int,int)
                this.override_NyARBinRaster2(toInt(arguments[0]), toInt(arguments[1]));
                break;
            case 3: //(int,int,bool)
                this.override_NyARBinRaster3(toInt(arguments[0]), toInt(arguments[1]), Boolean(arguments[2]));
                break;
            case 4: //(int,int,int,bool)
                this.override_NyARBinRaster4(toInt(arguments[0]), toInt(arguments[1]), toInt(arguments[2]), Boolean(arguments[3]));
                break;
            default:
                throw new NyARException();
        }
    },
    override_NyARBinRaster4: function(i_width, i_height, i_raster_type, i_is_alloc) { // Please specify a constant value defined in NyARBufferType.
        NyARRaster_BasicClass.overload_NyARRaster_BasicClass.call(this, i_width, i_height, i_raster_type);
        if (!this.initInstance(this._size, i_raster_type, i_is_alloc)) {
            throw new NyARException();
        }
    },
    override_NyARBinRaster3: function(i_width, i_height, i_is_alloc) {
        NyARRaster_BasicClass.overload_NyARRaster_BasicClass.call(this, i_width, i_height, NyARBufferType.INT1D_BIN_8);
        if (!this.initInstance(this._size, NyARBufferType.INT1D_BIN_8, i_is_alloc)) {
            throw new NyARException();
        }
    },
    override_NyARBinRaster2: function(i_width, i_height) {
        NyARRaster_BasicClass.overload_NyARRaster_BasicClass.call(this, i_width, i_height, NyARBufferType.INT1D_BIN_8);
        if (!this.initInstance(this._size, NyARBufferType.INT1D_BIN_8, true)) {
            throw new NyARException();
        }
    },
    initInstance: function(i_size, i_buf_type, i_is_alloc) {
        switch (i_buf_type)
        {
            case NyARBufferType.INT1D_BIN_8:
                this._buf = i_is_alloc ? new IntVector(i_size.w * i_size.h) : null;
                break;
            default:
                return false;
        }
        this._is_attached_buffer = i_is_alloc;
        return true;
    },
    getBuffer: function() {
        return this._buf;
    },
    // return the instance owns the buffer.
    // If you create a raster with i_is_alloc to false in the constructor,
    // before you can access the buffer, please check in this function the presence or absence of a buffer.
    hasBuffer: function() {
        return this._buf != null;
    },
    wrapBuffer: function(i_ref_buf) {
        NyAS3Utils.assert(!this._is_attached_buffer);//It does not work buffer if it is attached.
        this._buf = i_ref_buf;
    }
});

NyARGrayscaleRaster = ASKlass('NyARGrayscaleRaster', NyARRaster_BasicClass, {
    _buf: null,
    _is_attached_buffer: null, // Buffer true if the object is attached
    NyARGrayscaleRaster: function() {
        NyARRaster_BasicClass.initialize.call(this, NyAS3Const_Inherited);
        switch (arguments.length) {
            case 1:
                if (arguments[0] == NyAS3Const_Inherited) {
                    //blank
                }
                break;
            case 2:
                //(int,int)
                this.overload_NyARGrayscaleRaster2(toInt(arguments[0]), toInt(arguments[1]));
                break;
            case 3:
                //(int,int,boolean)
                this.overload_NyARGrayscaleRaster3(toInt(arguments[0]), toInt(arguments[1]), Boolean(arguments[2]));
                break;
            case 4:
                //(int,int,int,boolean)
                this.overload_NyARGrayscaleRaster4(toInt(arguments[0]), toInt(arguments[1]), toInt(arguments[2]), Boolean(arguments[3]));
                break;
            default:
                throw new NyARException();
        }
    },
    overload_NyARGrayscaleRaster2: function(i_width, i_height) {
        NyARRaster_BasicClass.overload_NyARRaster_BasicClass.call(this, i_width, i_height, NyARBufferType.INT1D_GRAY_8);
        if (!this.initInstance(this._size, NyARBufferType.INT1D_GRAY_8, true)) {
            throw new NyARException();
        }
    },
    overload_NyARGrayscaleRaster3: function(i_width, i_height, i_is_alloc) {
        NyARRaster_BasicClass.overload_NyARRaster_BasicClass.call(this, i_width, i_height, NyARBufferType.INT1D_GRAY_8);
        if (!this.initInstance(this._size, NyARBufferType.INT1D_GRAY_8, i_is_alloc)) {
            throw new NyARException();
        }
    },
    overload_NyARGrayscaleRaster4: function(i_width, i_height, i_raster_type, i_is_alloc) { //Please specify a constant value defined in NyARBufferType.
        NyARRaster_BasicClass.overload_NyARRaster_BasicClass.call(this, i_width, i_height, i_raster_type);
        if (!this.initInstance(this._size, i_raster_type, i_is_alloc)) {
            throw new NyARException();
        }
    },
    initInstance: function(i_size, i_buf_type, i_is_alloc) {
        switch (i_buf_type) {
            case NyARBufferType.INT1D_GRAY_8:
                this._buf = i_is_alloc ? new IntVector(i_size.w * i_size.h) : null;
                break;
            default:
                return false;
        }
        this._is_attached_buffer = i_is_alloc;
        return true;
    },
    getBuffer: function() {
        return this._buf;
    },
    // return the instance owns the buffer.
    // If you create a raster with i_is_alloc to false in the constructor,
    // before you can access the buffer, please check in this function the presence or absence of a buffer.
    hasBuffer: function() {
        return this._buf != null;
    },
    wrapBuffer: function(i_ref_buf) {
        NyAS3Utils.assert(!this._is_attached_buffer); // It does not work buffer if it is attached.
        this._buf = i_ref_buf;
    }
});

NyARRaster = ASKlass('NyARRaster', NyARRaster_BasicClass, {// This class is a single-function NyARRaster.
    _buf: null,
    _buf_type: 0,
    _is_attached_buffer: null, // Buffer true if the object is attached
    NyARRaster: function() {
        NyARRaster_BasicClass.initialize.call(this, NyAS3Const_Inherited);
        switch (arguments.length) {
            case 1:
                break;
            case 3:
                this.overload_NyARRaster3(toInt(arguments[0]), toInt(arguments[1]), toInt(arguments[2]));
                break;
            case 4:
                this.overload_NyARRaster4(toInt(arguments[0]), toInt(arguments[1]), toInt(arguments[2]), Boolean(arguments[3]));
                break;
            default:
                throw new NyARException();
        }
    },
    overload_NyARRaster4: function(i_width, i_height, i_buffer_type, i_is_alloc) { // Create a raster of buffer, value defined in NyARBufferType.
        NyARRaster_BasicClass.overload_NyARRaster_BasicClass.call(this, i_width, i_height, i_buffer_type);
        if (!this.initInstance(this._size, i_buffer_type, i_is_alloc)) {
            throw new NyARException();
        }
        return;
    },
    overload_NyARRaster3: function(i_width, i_height, i_buffer_type) {
        NyARRaster_BasicClass.overload_NyARRaster_BasicClass.call(this, i_width, i_height, i_buffer_type);
        if (!this.initInstance(this._size, i_buffer_type, true)) {
            throw new NyARException();
        }
        return;
    },
    initInstance: function(i_size, i_buf_type, i_is_alloc) {
        switch (i_buf_type)
        {
            case NyARBufferType.INT1D_X8R8G8B8_32:
                this._buf = i_is_alloc ? new IntVector(i_size.w * i_size.h) : null;
                break;
            default:
                return false;
        }
        this._is_attached_buffer = i_is_alloc;
        return true;
    },
    getBuffer: function() {
        return this._buf;
    },
    // return the instance owns the buffer.
    // If you create a raster with i_is_alloc to false in the constructor,
    // Before you can access the buffer, please check in this function the presence or absence of a buffer.
    hasBuffer: function() {
        return this._buf != null;
    },
    wrapBuffer: function(i_ref_buf) {
        NyAS3Utils.assert(!this._is_attached_buffer); // It does not work buffer if it is attached.
        this._buf = i_ref_buf;
    }
});
INyARRgbRaster = ASKlass('INyARRgbRaster', INyARRaster, {// Raster can represent 8bitRGB
    getRgbPixelReader: function() {
    }
});

NyARRgbRaster_BasicClass = ASKlass('NyARRgbRaster_BasicClass', INyARRgbRaster, {// Class that implements the basic function / member of NyARRaster interface
    _size: null,
    _buffer_type: 0,
    NyARRgbRaster_BasicClass: function() {
        switch (arguments.length) {
            case 1:
                if (arguments[0] == NyAS3Const_Inherited) {
                    //blank
                }
                break;
            case 3: //(int,int,int)                
                this.overload_NyARRgbRaster_BasicClass(toInt(arguments[0]), toInt(arguments[1]), toInt(arguments[2]));
                break;
            default:
                throw new NyARException();
        }
    },
    overload_NyARRgbRaster_BasicClass: function(i_width, i_height, i_buffer_type) {
        this._size = new NyARIntSize(i_width, i_height);
        this._buffer_type = i_buffer_type;
    },
    getWidth: function() {
        return this._size.w;
    },
    getHeight: function() {
        return this._size.h;
    },
    getSize: function() {
        return this._size;
    },
    getBufferType: function() {
        return this._buffer_type;
    },
    isEqualBufferType: function(i_type_value) {
        return this._buffer_type == i_type_value;
    },
    getRgbPixelReader: function() {
        throw new NyARException();
    },
    getBuffer: function() {
        throw new NyARException();
    },
    hasBuffer: function() {
        throw new NyARException();
    },
    wrapBuffer: function(i_ref_buf) {
        throw new NyARException();
    }
});

NyARRgbRaster = ASKlass('NyARRgbRaster', NyARRgbRaster_BasicClass, {
    _buf: null,
    _reader: null, // Buffer true if the object is attached
    _is_attached_buffer: null,
    NyARRgbRaster: function() {
        NyARRgbRaster_BasicClass.initialize.call(this, NyAS3Const_Inherited);
        switch (arguments.length) {
            case 1:
                if (arguments[0] == NyAS3Const_Inherited) {
                    //blank
                }
                break;
            case 3:
                this.overload_NyARRgbRaster3(toInt(arguments[0]), toInt(arguments[1]), toInt(arguments[2]));
                break;
            case 4:
                this.overload_NyARRgbRaster4(toInt(arguments[0]), toInt(arguments[1]), toInt(arguments[2]), Boolean(arguments[3]));
                break;
            default:
                throw new NyARException();
        }
    },
    overload_NyARRgbRaster4: function(i_width, i_height, i_raster_type, i_is_alloc) { // specify a constant defined in NyARBufferType.
        NyARRgbRaster_BasicClass.overload_NyARRgbRaster_BasicClass.call(this, i_width, i_height, i_raster_type);
        if (!this.initInstance(this._size, i_raster_type, i_is_alloc)) {
            throw new NyARException();
        }
    },
    overload_NyARRgbRaster3: function(i_width, i_height, i_raster_type) { // specify a constant defined in NyARBufferType.
        NyARRgbRaster_BasicClass.overload_NyARRgbRaster_BasicClass.call(this, i_width, i_height, i_raster_type);
        if (!this.initInstance(this._size, i_raster_type, true)) {
            throw new NyARException();
        }
    },
    initInstance: function(i_size, i_raster_type, i_is_alloc) {
        switch (i_raster_type)
        {
            case NyARBufferType.INT1D_X8R8G8B8_32:
                this._buf = i_is_alloc ? new IntVector(i_size.w * i_size.h) : null;
                this._reader = new NyARRgbPixelReader_INT1D_X8R8G8B8_32(this._buf || new IntVector(1), i_size);
                break;
            case NyARBufferType.BYTE1D_B8G8R8X8_32:
            case NyARBufferType.BYTE1D_R8G8B8_24:
            default:
                return false;
        }
        this._is_attached_buffer = i_is_alloc;
        return true;
    },
    getRgbPixelReader: function() {
        return this._reader;
    },
    getBuffer: function() {
        return this._buf;
    },
    hasBuffer: function() {
        return this._buf != null;
    },
    wrapBuffer: function(i_ref_buf) {
        NyAS3Utils.assert(!this._is_attached_buffer); // buffer not work if is attached.
        this._buf = i_ref_buf;
        this._reader.switchBuffer(i_ref_buf); // switch the reference buffer of pixels leader.
    }
});

NyARRgbRaster_Canvas2D = ASKlass("NyARRgbRaster_Canvas2D", NyARRgbRaster_BasicClass, {
    _canvas: null,
    _rgb_reader: null,
    NyARRgbRaster_Canvas2D: function(canvas) {
        NyARRgbRaster_BasicClass.initialize.call(this, canvas.width, canvas.height, NyARBufferType.OBJECT_JS_Canvas);
        this._canvas = canvas;
        this._rgb_reader = new NyARRgbPixelReader_Canvas2D(this._canvas);
    },
    getRgbPixelReader: function() {
        return this._rgb_reader;
    },
    getBuffer: function() {
        return this._canvas;
    },
    hasBuffer: function() {
        return this._bitmapData != null;
    }
});

FLARCanvas = function(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
};

FLARBinRaster = ASKlass('FLARBinRaster', NyARBinRaster, {
    FLARBinRaster: function(i_width, i_height) {
        NyARBinRaster.initialize.call(this, i_width, i_height, NyARBufferType.OBJECT_AS3_BitmapData, true);
        this._gray_reader = new FLARGrayPixelReader_BitmapData(this._buf);
    }
    ,
    initInstance: function(i_size, i_buf_type, i_is_alloc) {
        this._buf = i_is_alloc ? new BitmapData(i_size.w, i_size.h, 0x00) : null;
        return true;
    }
    ,
    getGrayPixelReader: function() {
        return this._gray_reader;
    }
})


FLARRgbRaster_BitmapData = ASKlass('FLARRgbRaster_BitmapData', NyARRgbRaster_BasicClass, {
    _bitmapData: null,
    _rgb_reader: null
    ,
    //@deprecated It is changed as follows in the next version. FLARRgbRaster_BitmapData (i_width, i_height)    
    FLARRgbRaster_BitmapData: function(bitmapData) {
        NyARRgbRaster_BasicClass.initialize.call(this, bitmapData.width, bitmapData.height, NyARBufferType.OBJECT_AS3_BitmapData);
        this._bitmapData = bitmapData;
        this._rgb_reader = new FLARRgbPixelReader_BitmapData(this._bitmapData);
    }
    , getRgbPixelReader: function() {
        return this._rgb_reader;
    }
    , getBuffer: function() {
        return this._bitmapData;
    }
    , hasBuffer: function() {
        return this._bitmapData != null;
    }
});

NyARMatchPattDeviationBlackWhiteData = ASKlass('NyARMatchPattDeviationBlackWhiteData', {
    _data: null,
    _pow: 0,
    _number_of_pixels: 0,
    refData: function() {
        return this._data;
    },
    getPow: function() {
        return this._pow;
    },
    NyARMatchPattDeviationBlackWhiteData: function(i_width, i_height) {
        this._number_of_pixels = i_height * i_width;
        this._data = new IntVector(this._number_of_pixels);
        return;
    }
    ,
    setRaster: function(i_raster) { // From an array of XRGB [width * height], to build the pattern data.
        // i_buffer [XRGB] → difference [BW] conversion
        var i;
        var ave; //<PV/>
        var rgb; //<PV/>
        var linput = this._data; //<PV/>
        var buf = (i_raster.getBuffer());
        // wh and size of the input array or update // input = new int [height] [width] [3]
        var number_of_pixels = this._number_of_pixels;
        // (1/8 of deployment FOR) average calculation
        ave = 0;
        for (i = number_of_pixels - 1; i >= 0; i--) {
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
        }
        ave = (number_of_pixels * 255 * 3 - ave) / (3 * number_of_pixels);

        var sum = 0, w_sum;
        // Difference value calculation
        for (i = number_of_pixels - 1; i >= 0; i--) {
            rgb = buf[i];
            w_sum = ((255 * 3 - (rgb & 0xff) - ((rgb >> 8) & 0xff) - ((rgb >> 16) & 0xff)) / 3) - ave;
            linput[i] = w_sum;
            sum += w_sum * w_sum;
        }
        var p = Math.sqrt(sum);
        this._pow = p != 0.0 ? p : 0.0000001;
        return;
    }
});

NyARMatchPattDeviationColorData = ASKlass('NyARMatchPattDeviationColorData', {
    _data: null,
    _pow: 0,
    _number_of_pixels: 0,
    _optimize_for_mod: 0,
    refData: function() {
        return this._data;
    },
    getPow: function() {
        return this._pow;
    }
    ,
    NyARMatchPattDeviationColorData: function(i_width, i_height) {
        this._number_of_pixels = i_height * i_width;
        this._data = new IntVector(this._number_of_pixels * 3);
        this._optimize_for_mod = this._number_of_pixels - (this._number_of_pixels % 8);
        return;
    }
    ,
    // I will set the pattern data from NyARRaster.
    // This function updates the data area that owns based on the data.
    setRaster: function(i_raster) {
        // Pixel format, size limit
        NyAS3Utils.assert(i_raster.isEqualBufferType(NyARBufferType.INT1D_X8R8G8B8_32));
        NyAS3Utils.assert(i_raster.getSize().isEqualSize_NyARIntSize(i_raster.getSize()));
        var buf = (i_raster.getBuffer());
        // [R, G, B] conversion i_buffer [XRGB] → difference
        var i;
        var ave; //<PV/>
        var rgb; //<PV/>
        var linput = this._data; //<PV/>
        // wh and size of the input array also update // input = new int [height] [width] [3];
        var number_of_pixels = this._number_of_pixels;
        var for_mod = this._optimize_for_mod;
        // (1/8 deployment FOR) average calculation
        ave = 0;
        for (i = number_of_pixels - 1; i >= for_mod; i--) {
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
        }
        for (; i >= 0; ) {
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
            i--;
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
            i--;
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
            i--;
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
            i--;
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
            i--;
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
            i--;
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
            i--;
            rgb = buf[i];
            ave += ((rgb >> 16) & 0xff) + ((rgb >> 8) & 0xff) + (rgb & 0xff);
            i--;
        }
        // (1/8 of deployment FOR) average calculation
        ave = number_of_pixels * 255 * 3 - ave;
        ave = 255 - (ave / (number_of_pixels * 3)); //Precomputed for decomposing (255-R)-ave
        var sum = 0, w_sum;
        var input_ptr = number_of_pixels * 3 - 1;
        //(1/8 of deployment FOR) difference value calculation
        for (i = number_of_pixels - 1; i >= for_mod; i--) {
            rgb = buf[i];
            w_sum = (ave - (rgb & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//B
            w_sum = (ave - ((rgb >> 8) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//G
            w_sum = (ave - ((rgb >> 16) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//R
        }
        for (; i >= 0; ) {
            rgb = buf[i];
            i--;
            w_sum = (ave - (rgb & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//B
            w_sum = (ave - ((rgb >> 8) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//G
            w_sum = (ave - ((rgb >> 16) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//R
            rgb = buf[i];
            i--;
            w_sum = (ave - (rgb & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//B
            w_sum = (ave - ((rgb >> 8) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//G
            w_sum = (ave - ((rgb >> 16) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//R
            rgb = buf[i];
            i--;
            w_sum = (ave - (rgb & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//B
            w_sum = (ave - ((rgb >> 8) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//G
            w_sum = (ave - ((rgb >> 16) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//R
            rgb = buf[i];
            i--;
            w_sum = (ave - (rgb & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//B
            w_sum = (ave - ((rgb >> 8) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//G
            w_sum = (ave - ((rgb >> 16) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//R
            rgb = buf[i];
            i--;
            w_sum = (ave - (rgb & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//B
            w_sum = (ave - ((rgb >> 8) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//G
            w_sum = (ave - ((rgb >> 16) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//R
            rgb = buf[i];
            i--;
            w_sum = (ave - (rgb & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//B
            w_sum = (ave - ((rgb >> 8) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//G
            w_sum = (ave - ((rgb >> 16) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//R
            rgb = buf[i];
            i--;
            w_sum = (ave - (rgb & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//B
            w_sum = (ave - ((rgb >> 8) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//G
            w_sum = (ave - ((rgb >> 16) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//R
            rgb = buf[i];
            i--;
            w_sum = (ave - (rgb & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//B
            w_sum = (ave - ((rgb >> 8) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//G
            w_sum = (ave - ((rgb >> 16) & 0xff));
            linput[input_ptr--] = w_sum;
            sum += w_sum * w_sum;//R
        }
        // (1/8 of deployment FOR) difference value calculation
        var p = Math.sqrt(sum);
        this._pow = p != 0.0 ? p : 0.0000001;
        return;
    }
});

NyARMatchPattResult = ASKlass('NyARMatchPattResult', {
    DIRECTION_UNKNOWN: -1,
    confidence: 0,
    direction: 0
});

NyARCode = ASKlass('NyARCode', {// keep one of the marker code ARToolKit.
    _color_pat: new Array(4),
    _bw_pat: new Array(4),
    _width: 0,
    _height: 0
    ,
    NyARCode: function(i_width, i_height) {
        this._width = i_width;
        this._height = i_height;
        for (var i = 0; i < 4; i++) { // The four create a raster empty
            this._color_pat[i] = new NyARMatchPattDeviationColorData(i_width, i_height);
            this._bw_pat[i] = new NyARMatchPattDeviationBlackWhiteData(i_width, i_height);
        }
        return;
    },
    getColorData: function(i_index) {
        return this._color_pat[i_index];
    },
    getBlackWhiteData: function(i_index) {
        return this._bw_pat[i_index];
    },
    getWidth: function() {
        return this._width;
    },
    getHeight: function() {
        return this._height;
    },
    loadARPattFromFile: function(i_stream) {
        NyARCodeFileReader.loadFromARToolKitFormFile(i_stream, this);
        return;
    },
    setRaster: function(i_raster) {
        NyAS3Utils.assert(i_raster.length != 4);
        for (var i = 0; i < 4; i++) { // I load a raster pattern to
            this._color_pat[i].setRaster(i_raster[i]);
        }
        return;
    }
});

NyARCodeFileReader = ASKlass('NyARCodeFileReader', {
    loadFromARToolKitFormFile: function(i_stream, o_code) { // Stores o_code by reading the AR code file
        var width = o_code.getWidth();
        var height = o_code.getHeight();
        var tmp_raster = new NyARRaster(width, height, NyARBufferType.INT1D_X8R8G8B8_32);
        // set to raster four elements.
        var token = i_stream.match(/\d+/g);
        var buf = (tmp_raster.getBuffer());
        // read once in the GBRA.
        for (var h = 0; h < 4; h++) {
            this.readBlock(token, width, height, buf);
            // ARCode to set (color)
            o_code.getColorData(h).setRaster(tmp_raster);
            o_code.getBlackWhiteData(h).setRaster(tmp_raster);
        }
        tmp_raster = null;
        return;
    }
    ,
    // I will read to o_buf i_st from the XRGB data of one block.
    readBlock: function(i_st, i_width, i_height, o_buf) {
        var pixels = i_width * i_height;
        var i3;
        for (i3 = 0; i3 < 3; i3++) {
            for (var i2 = 0; i2 < pixels; i2++) {
                // read only the number
                var val = parseInt(i_st.shift());
                if (isNaN(val)) {
                    throw new NyARException("syntax error in pattern file.");
                }
                o_buf[i2] = (o_buf[i2] << 8) | ((0x000000ff & toInt(val)));
            }
        }
        for (i3 = 0; i3 < pixels; i3++) { //GBR→RGB
            o_buf[i3] = ((o_buf[i3] << 16) & 0xff0000) | (o_buf[i3] & 0x00ff00) | ((o_buf[i3] >> 16) & 0x0000ff);
        }
        return;
    }
});

FLARCode = ASKlass('FLARCode', NyARCode, {
    markerPercentWidth: 50,
    markerPercentHeight: 50,
    // @param i_width = number of divisions on width direction 
    // @param i_height = number of divisions on height direction
    // @param i_markerPercentWidth = marker in the entire (body + frame), the proportion of the marker body portion (width) 
    // @param i_markerPercentHeight = marker in the entire (body + frame), the proportion of the marker body portion (height)
    FLARCode: function(i_width, i_height, i_markerPercentWidth, i_markerPercentHeight) {
        NyARCode.initialize.call(this, i_width, i_height);
        this.markerPercentWidth = i_markerPercentWidth == null ? 50 : i_markerPercentWidth;
        this.markerPercentHeight = i_markerPercentHeight == null ? 50 : i_markerPercentHeight;
    },
    loadARPatt: function(i_stream) {
        NyARCode.loadARPattFromFile.call(this, i_stream);
        return;
    }
});

// interface for matching ARColorPatt. about the reference Pat, compare operation between the ARCode calculated data
// define the pattern detection class of three to decompose pattern_match function
INyARMatchPatt = ASKlass('INyARMatchPatt', {
    setARCode: function(i_code) {
    }
});

NyARMatchPatt_Color_WITHOUT_PCA = ASKlass('NyARMatchPatt_Color_WITHOUT_PCA', INyARMatchPatt, {
    _code_patt: null,
    _optimize_for_mod: 0,
    _rgbpixels: 0,
    NyARMatchPatt_Color_WITHOUT_PCA: function() {
        switch (arguments.length) {
            case 1:
                {  // NyARMatchPatt_Color_WITHOUT_PCA : function(i_code_ref)
                    var i_code_ref = arguments[0];
                    var w = i_code_ref.getWidth();
                    var h = i_code_ref.getHeight();
                    // Calculation of constant optimization
                    this._rgbpixels = w * h * 3;
                    this._optimize_for_mod = this._rgbpixels - (this._rgbpixels % 16);
                    this.setARCode(i_code_ref);
                    return;
                }
                break;
            case 2:
                {  //,NyARMatchPatt_Color_WITHOUT_PCA : function(i_width,i_height)
                    var i_width = toInt(arguments[0]), i_height = toInt(arguments[1]);
                    // Calculation of constant optimization
                    this._rgbpixels = i_height * i_width * 3;
                    this._optimize_for_mod = this._rgbpixels - (this._rgbpixels % 16);
                    return;
                }
                break;
            default:
                break;
        }
        throw new NyARException();
    }
    ,
    setARCode: function(i_code_ref) { // set the ARCode to compare.
        this._code_patt = i_code_ref;
        return;
    }
    ,
    evaluate: function(i_patt, o_result) { // compares the i_patt AR and code that is currently set.
        NyAS3Utils.assert(this._code_patt != null);
        //
        var linput = i_patt.refData();
        console.log(linput)
        var sum;
        var max = Number.MIN_VALUE;
        var res = NyARMatchPattResult.DIRECTION_UNKNOWN;
        var for_mod = this._optimize_for_mod;
        for (var j = 0; j < 4; j++) {
            // Total value initialization
            sum = 0;
            var code_patt = this._code_patt.getColorData(j);
            var pat_j = code_patt.refData();

            // For all pixels, (1/16 deployment of FOR) comparison
            var i;
            for (i = this._rgbpixels - 1; i >= for_mod; i--) {
                sum += linput[i] * pat_j[i];
            }
            for (; i >= 0; ) {
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
                sum += linput[i] * pat_j[i];
                i--;
            }

            var sum2 = sum / code_patt.getPow(); // sum2 = sum / patpow[k][j]/ datapow;
            if (sum2 > max) {
                max = sum2;
                res = j;
            }
        }
        o_result.direction = res;
        o_result.confidence = max / i_patt.getPow();
        return true;
    }
});

NyARRasterAnalyzer_Histogram = ASKlass('NyARRasterAnalyzer_Histogram', {
    _histImpl: null
    ,
    // Vertical direction skip number of histogram analysis. Inheriting class to this number of lines at a time
    // Making a histogram calculation while skipping
    _vertical_skip: 0,
    NyARRasterAnalyzer_Histogram: function(i_raster_format, i_vertical_interval) {
        if (!this.initInstance(i_raster_format, i_vertical_interval)) {
            throw new NyARException();
        }
    }
    ,
    initInstance: function(i_raster_format, i_vertical_interval) {
        switch (i_raster_format) {
            case NyARBufferType.INT1D_GRAY_8:
                this._histImpl = new NyARRasterThresholdAnalyzer_Histogram_INT1D_GRAY_8();
                break;
            case NyARBufferType.INT1D_X8R8G8B8_32:
                this._histImpl = new NyARRasterThresholdAnalyzer_Histogram_INT1D_X8R8G8B8_32();
                break;
            default:
                return false;
        }
        this._vertical_skip = i_vertical_interval; //Initialization
        return true;
    }
    ,
    setVerticalInterval: function(i_step) {
        this._vertical_skip = i_step;
        return;
    }
    ,
    analyzeRaster: function(i_input, o_histgram) { // output the histogram to o_histgram
        var size = i_input.getSize();
        // Limit on the maximum image size
        NyAS3Utils.assert(size.w * size.h < 0x40000000);
        NyAS3Utils.assert(o_histgram.length == 256); // Now fixed
        var h = o_histgram.data;
        // Histogram initialization
        for (var i = o_histgram.length - 1; i >= 0; i--) {
            h[i] = 0;
        }
        o_histgram.total_of_data = size.w * size.h / this._vertical_skip;
        return this._histImpl.createHistogram(i_input, size, h, this._vertical_skip);
    }
});

ICreateHistogramImpl = ASKlass('ICreateHistogramImpl', {
    createHistogram: function(i_reader, i_size, o_histgram, i_skip) {
    }
});

NyARRasterThresholdAnalyzer_Histogram_INT1D_GRAY_8 = ASKlass('NyARRasterThresholdAnalyzer_Histogram_INT1D_GRAY_8', ICreateHistogramImpl, {
    createHistogram: function(i_reader, i_size, o_histgram, i_skip) {
        NyAS3Utils.assert(i_reader.isEqualBufferType(NyARBufferType.INT1D_GRAY_8));
        var input = (IntVector)(i_reader.getBuffer());
        for (var y = i_size.h - 1; y >= 0; y -= i_skip) {
            var pt = y * i_size.w;
            for (var x = i_size.w - 1; x >= 0; x--) {
                o_histgram[input[pt]]++;
                pt++;
            }
        }
        return i_size.w * i_size.h;
    }
});

NyARRasterThresholdAnalyzer_Histogram_INT1D_X8R8G8B8_32 = ASKlass('NyARRasterThresholdAnalyzer_Histogram_INT1D_X8R8G8B8_32', ICreateHistogramImpl, {
    createHistogram: function(i_reader, i_size, o_histgram, i_skip) {
        NyAS3Utils.assert(i_reader.isEqualBufferType(NyARBufferType.INT1D_X8R8G8B8_32));
        var input = (i_reader.getBuffer());
        for (var y = i_size.h - 1; y >= 0; y -= i_skip) {
            var pt = y * i_size.w;
            for (var x = i_size.w - 1; x >= 0; x--) {
                var p = input[pt];
                o_histgram[((p & 0xff) + (p & 0xff) + (p & 0xff)) / 3]++;
                pt++;
            }
        }
        return i_size.w * i_size.h;
    }
});

INyARRasterThresholdAnalyzer = ASKlass('INyARRasterThresholdAnalyzer', {
    analyzeRaster: function(i_input) {
    }
});

NyARRasterThresholdAnalyzer_SlidePTile = ASKlass('NyARRasterThresholdAnalyzer_SlidePTile', INyARRasterThresholdAnalyzer, {
    _raster_analyzer: null,
    _sptile: null,
    _histgram: null,
    NyARRasterThresholdAnalyzer_SlidePTile: function(i_persentage, i_raster_format, i_vertical_interval) {
        NyAS3Utils.assert(0 <= i_persentage && i_persentage <= 50);
        //Initialization
        if (!this.initInstance(i_raster_format, i_vertical_interval)) {
            throw new NyARException();
        }
        this._sptile = new NyARHistogramAnalyzer_SlidePTile(i_persentage);
        this._histgram = new NyARHistogram(256);
    }
    ,
    initInstance: function(i_raster_format, i_vertical_interval) {
        this._raster_analyzer = new NyARRasterAnalyzer_Histogram(i_raster_format, i_vertical_interval);
        return true;
    }
    ,
    setVerticalInterval: function(i_step) {
        this._raster_analyzer.setVerticalInterval(i_step);
        return;
    }
    ,
    analyzeRaster: function(i_input) {
        this._raster_analyzer.analyzeRaster(i_input, this._histgram);
        return this._sptile.getThreshold(this._histgram);
    }
});

FLARRasterAnalyzer_Histogram = ASKlass('FLARRasterAnalyzer_Histogram', NyARRasterAnalyzer_Histogram, {
    FLARRasterAnalyzer_Histogram: function(i_vertical_interval) {
        NyARRasterAnalyzer_Histogram.initialize.call(this, NyARBufferType.OBJECT_AS3_BitmapData, i_vertical_interval);
    }
    ,
    initInstance: function(i_raster_format, i_vertical_interval) {
        if (i_raster_format != NyARBufferType.OBJECT_AS3_BitmapData) {
            return false;
        } else {
            this._vertical_skip = i_vertical_interval;
        }
        return true;
    }
    ,
    analyzeRaster: function(i_input, o_histgram) { // output the histogram to o_histgram
        var size = i_input.getSize();
        NyAS3Utils.assert(size.w * size.h < 0x40000000); // Limit on the maximum image size
        NyAS3Utils.assert(o_histgram.length == 256); // Now fixed
        var h = o_histgram.data;
        // Histogram initialization
        for (var i = o_histgram.length - 1; i >= 0; i--) {
            h[i] = 0;
        }
        o_histgram.total_of_data = size.w * size.h / this._vertical_skip;
        return this.createHistgram_AS3_BitmapData(i_input, size, h, this._vertical_skip);
    }
    ,
    createHistgram_AS3_BitmapData: function(i_reader, i_size, o_histgram, i_skip) {
        //[TO DO:] from non-performance and it is this way, of Bitmapdata
        NyAS3Utils.assert(i_reader.isEqualBufferType(NyARBufferType.OBJECT_AS3_BitmapData));
        var input = (i_reader.getBuffer());
        for (var y = i_size.h - 1; y >= 0; y -= i_skip) {
            var pt = y * i_size.w;
            for (var x = i_size.w - 1; x >= 0; x--) {
                var p = input.getPixel(x, y);
                o_histgram[toInt((((p >> 8) & 0xff) + ((p >> 16) & 0xff) + (p & 0xff)) / 3)]++;
                pt++;
            }
        }
        return i_size.w * i_size.h;
    }
});

FLARRasterThresholdAnalyzer_SlidePTile = ASKlass('FLARRasterThresholdAnalyzer_SlidePTile', NyARRasterThresholdAnalyzer_SlidePTile, {
    FLARRasterThresholdAnalyzer_SlidePTile: function(i_persentage, i_vertical_interval) {
        NyARRasterThresholdAnalyzer_SlidePTile.initialize.call(this, i_persentage, NyARBufferType.OBJECT_AS3_BitmapData, i_vertical_interval);
    }
    ,
    initInstance: function(i_raster_format, i_vertical_interval) {
        if (i_raster_format != NyARBufferType.OBJECT_AS3_BitmapData) {
            return false;
        }
        this._raster_analyzer = new FLARRasterAnalyzer_Histogram(i_vertical_interval);
        return true;
    }
});

INyARRasterFilter = ASKlass('INyARRasterFilter', {
    doFilter: function(i_input, i_output) {
    }
});

INyARRasterFilter_Gs2Bin = ASKlass('INyARRasterFilter_Gs2Bin', {
    doFilter: function(i_input, i_output) {
    }
});

INyARRasterFilter_Rgb2Gs = ASKlass('INyARRasterFilter_Rgb2Gs', {
    doFilter: function(i_input, i_output) {
    }
});

INyARRasterFilter_Rgb2Bin = ASKlass('INyARRasterFilter_Rgb2Bin', {
    doFilter: function(i_input, i_output) {
    }
});

NyARRasterFilter_ARToolkitThreshold = ASKlass('NyARRasterFilter_ARToolkitThreshold', INyARRasterFilter_Rgb2Bin, {// binarization by a constant threshold
    _threshold: 0,
    _do_threshold_impl: null,
    NyARRasterFilter_ARToolkitThreshold: function(i_threshold, i_input_raster_type) {
        this._threshold = i_threshold;
        switch (i_input_raster_type) {
            case NyARBufferType.INT1D_X8R8G8B8_32:
                this._do_threshold_impl = new doThFilterImpl_BUFFERFORMAT_INT1D_X8R8G8B8_32();
                break;
            default:
                throw new NyARException();
        }
    }
    ,
    setThreshold: function(i_threshold) { // Threshold for binarizing the image. Scotoma <= th < It becomes the bright point
        this._threshold = i_threshold;
    }
    ,
    doFilter: function(i_input, i_output) {
        NyAS3Utils.assert(i_output.isEqualBufferType(NyARBufferType.INT1D_BIN_8));
        NyAS3Utils.assert(i_input.getSize().isEqualSize_NyARIntSize(i_output.getSize()) == true);
        this._do_threshold_impl.doThFilter(i_input, i_output, i_output.getSize(), this._threshold);
        return;
    }
});

IdoThFilterImpl = ASKlass('IdoThFilterImpl', {// Filter implementation for each raster from here
    doThFilter: function(i_input, i_output, i_size, i_threshold) {
    }
});

doThFilterImpl_BUFFERFORMAT_INT1D_X8R8G8B8_32 = ASKlass('doThFilterImpl_BUFFERFORMAT_INT1D_X8R8G8B8_32', IdoThFilterImpl, {
    doThFilter: function(i_input, i_output, i_size, i_threshold) {
        NyAS3Utils.assert(i_output.isEqualBufferType(NyARBufferType.INT1D_BIN_8));
        var out_buf = (IntVector)(i_output.getBuffer());
        var in_buf = (IntVector)(i_input.getBuffer());
        var th = i_threshold * 3;
        var w;
        var xy;
        var pix_count = i_size.h * i_size.w;
        var pix_mod_part = pix_count - (pix_count % 8);
        for (xy = pix_count - 1; xy >= pix_mod_part; xy--) {
            w = in_buf[xy];
            out_buf[xy] = (((w >> 16) & 0xff) + ((w >> 8) & 0xff) + (w & 0xff)) <= th ? 0 : 1;
        }
        // Tiling
        for (; xy >= 0; ) {
            w = in_buf[xy];
            out_buf[xy] = (((w >> 16) & 0xff) + ((w >> 8) & 0xff) + (w & 0xff)) <= th ? 0 : 1;
            xy--;
            w = in_buf[xy];
            out_buf[xy] = (((w >> 16) & 0xff) + ((w >> 8) & 0xff) + (w & 0xff)) <= th ? 0 : 1;
            xy--;
            w = in_buf[xy];
            out_buf[xy] = (((w >> 16) & 0xff) + ((w >> 8) & 0xff) + (w & 0xff)) <= th ? 0 : 1;
            xy--;
            w = in_buf[xy];
            out_buf[xy] = (((w >> 16) & 0xff) + ((w >> 8) & 0xff) + (w & 0xff)) <= th ? 0 : 1;
            xy--;
            w = in_buf[xy];
            out_buf[xy] = (((w >> 16) & 0xff) + ((w >> 8) & 0xff) + (w & 0xff)) <= th ? 0 : 1;
            xy--;
            w = in_buf[xy];
            out_buf[xy] = (((w >> 16) & 0xff) + ((w >> 8) & 0xff) + (w & 0xff)) <= th ? 0 : 1;
            xy--;
            w = in_buf[xy];
            out_buf[xy] = (((w >> 16) & 0xff) + ((w >> 8) & 0xff) + (w & 0xff)) <= th ? 0 : 1;
            xy--;
            w = in_buf[xy];
            out_buf[xy] = (((w >> 16) & 0xff) + ((w >> 8) & 0xff) + (w & 0xff)) <= th ? 0 : 1;
            xy--;
        }
    }
});

NyARContourPickup = ASKlass('NyARContourPickup', {
    // In order to be able to patrol reference, duplicating table
    // 0  1  2  3  4  5  6  7   0  1  2  3  4  5  6
    _getContour_xdir: new IntVector([0, 1, 1, 1, 0, -1, -1, -1, 0, 1, 1, 1, 0, -1, -1]),
    _getContour_ydir: new IntVector([-1, -1, 0, 1, 1, 1, 0, -1, -1, -1, 0, 1, 1, 1, 0]),
    getContour_NyARBinRaster: function(i_raster, i_entry_x, i_entry_y, i_array_size, o_coord_x, o_coord_y) {
        return this.impl_getContour(i_raster, 0, i_entry_x, i_entry_y, i_array_size, o_coord_x, o_coord_y);
    }
    ,
    // @param i_th = Threshold for binarizing the image. Will be <bright point <= i_th scotoma
    // @param i_entry_x = tracking start point of the contour
    getContour_NyARGrayscaleRaster: function(i_raster, i_th, i_entry_x, i_entry_y, i_array_size, o_coord_x, o_coord_y) {
        return this.impl_getContour(i_raster, i_th, i_entry_x, i_entry_y, i_array_size, o_coord_x, o_coord_y);
    }
    ,
    // return length array of the contour traced line from the entry point of the raster
    impl_getContour: function(i_raster, i_th, i_entry_x, i_entry_y, i_array_size, o_coord_x, o_coord_y) {
        var xdir = this._getContour_xdir; // static int xdir[8] = { 0, 1, 1, 1, 0,-1,-1,-1};
        var ydir = this._getContour_ydir; // static int ydir[8] = {-1,-1, 0, 1, 1, 1, 0,-1};
        var i_buf = i_raster.getBuffer();
        var width = i_raster.getWidth();
        var height = i_raster.getHeight();
        // get the point that is in contact with the upper end of the clip region
        var coord_num = 1;
        o_coord_x[0] = i_entry_x;
        o_coord_y[0] = i_entry_y;
        var dir = 5; //cinco
        var c = i_entry_x;
        var r = i_entry_y;
        for (; ; ) {
            dir = (dir + 5) % 8; //normalization of dir //cinco
            // I think that it can be optimized more if you work hard here.
            // In the case of the boundary of the ground other than the four corners, not be such as bounds checking
            if (c >= 1 && c < width - 1 && r >= 1 && r < height - 1) {
                for (; ; ) { // for statement of emulating the goto
                    // When it is not in contact with the boundary (decision point dark)
                    if (i_buf[(r + ydir[dir]) * width + (c + xdir[dir])] <= i_th) {
                        break;
                    }
                    dir++;
                    if (i_buf[(r + ydir[dir]) * width + (c + xdir[dir])] <= i_th) {
                        break;
                    }
                    dir++;
                    if (i_buf[(r + ydir[dir]) * width + (c + xdir[dir])] <= i_th) {
                        break;
                    }
                    dir++;
                    if (i_buf[(r + ydir[dir]) * width + (c + xdir[dir])] <= i_th) {
                        break;
                    }
                    dir++;
                    if (i_buf[(r + ydir[dir]) * width + (c + xdir[dir])] <= i_th) {
                        break;
                    }
                    dir++;
                    if (i_buf[(r + ydir[dir]) * width + (c + xdir[dir])] <= i_th) {
                        break;
                    }
                    dir++;
                    if (i_buf[(r + ydir[dir]) * width + (c + xdir[dir])] <= i_th) {
                        break;
                    }
                    dir++;
                    if (i_buf[(r + ydir[dir]) * width + (c + xdir[dir])] <= i_th) {
                        break;
                    }
                    // Were examined all eight directions, but is does not have a label?
                    throw new NyARException();
                }
            } else {
                // When you are in contact with the boundary
                var i;
                for (i = 0; i < 8; i++) {
                    var x = c + xdir[dir];
                    var y = r + ydir[dir];
                    // Bounds checking
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        if (i_buf[(y) * width + (x)] <= i_th) {
                            break;
                        }
                    }
                    dir++; // No problem since you will want to refer to the double-length table
                }
                if (i == 8) {
                    // Were examined all eight directions, but is does not have a label?
                    throw new NyARException(); // return(-1);
                }
            }
            dir = dir % 8; // normalization of dir
            // Save c, to the r ycoord and xcoord
            c = c + xdir[dir];
            r = r + ydir[dir];
            o_coord_x[coord_num] = c;
            o_coord_y[coord_num] = r;
            // Exit condition determination
            if (c == i_entry_x && r == i_entry_y) {
                coord_num++;
                break;
            }
            coord_num++;
            if (coord_num == i_array_size) {
                return coord_num; // Profile has reached the end
            }
        }
        return coord_num;
    }
});

NyARCoord2Linear = ASKlass('NyARCoord2Linear', {
    _xpos: null,
    _ypos: null,
    _pca: null,
    __getSquareLine_evec: new NyARDoubleMatrix22(),
    __getSquareLine_mean: new FloatVector(2),
    __getSquareLine_ev: new FloatVector(2),
    _dist_factor: null,
    NyARCoord2Linear: function(i_size, i_distfactor_ref) {
        // When you create the distortion calculation table, consuming an area of ​​8 * width / height * 2
        // If you do not want to take the area, please just use the value of i_dist_factor_ref
        this._dist_factor = new NyARObserv2IdealMap(i_distfactor_ref, i_size);
        // Contour buffer
        this._pca = new NyARPca2d_MatrixPCA_O2();
        this._xpos = new FloatVector(i_size.w + i_size.h); // Maximum side length this._width + this._height
        this._ypos = new FloatVector(i_size.w + i_size.h); // Maximum side length this._width + this._height
        return;
    }
    ,
    // calculate the linear equation of ay + bx + c = 0 from the contour point set
    coord2Line: function(i_st, i_ed, i_xcoord, i_ycoord, i_cood_num, o_line) {
        // Get the vertex
        var n, st, ed;
        var w1;
        // Determination of search interval
        if (i_ed >= i_st) {
            // Contour vertices to [i +1] is, when in the one section from the vertex [i]
            w1 = (i_ed - i_st + 1) * 0.05 + 0.5;
            // Determination of search interval
            st = Math.floor(i_st + w1);
            ed = Math.floor(i_ed - w1);
        } else {
            // Contour vertices to [i +1] is, when it is divided into two sections of vertices [i]
            w1 = ((i_ed + i_cood_num - i_st + 1) % i_cood_num) * 0.05 + 0.5;
            // Determination of search interval
            st = (Math.floor(i_st + w1)) % i_cood_num;
            ed = (Math.floor(i_ed + i_cood_num - w1)) % i_cood_num;
        }
        // Check the search interval number
        if (st <= ed) {
            // Search interval is one section
            n = ed - st + 1;
            this._dist_factor.observ2IdealBatch(i_xcoord, i_ycoord, st, n, this._xpos, this._ypos, 0);
        } else {
            // Search interval is two sections
            n = ed + 1 + i_cood_num - st;
            this._dist_factor.observ2IdealBatch(i_xcoord, i_ycoord, st, i_cood_num - st, this._xpos, this._ypos, 0);
            this._dist_factor.observ2IdealBatch(i_xcoord, i_ycoord, 0, ed + 1, this._xpos, this._ypos, i_cood_num - st);
        }
        //Confirmation of the number of elements
        if (n < 2) {
            // As it is not possible n to calculate matrix.PCA less than or equal to 2, an error
            return false;
        }
        //To principal component analysis
        var evec = this.__getSquareLine_evec;
        var mean = this.__getSquareLine_mean;
        this._pca.pca(this._xpos, this._ypos, n, evec, this.__getSquareLine_ev, mean);
        o_line.dy = evec.m01;
        o_line.dx = -evec.m00;
        o_line.c = -(o_line.dy * mean[0] + o_line.dx * mean[1]);
        return true;
    }
});

NyARVertexCounter = ASKlass('NyARVertexCounter', {// class for disconnecting the get_vertex function
    vertex: new IntVector(10), // scraped up to 6
    number_of_vertex: 0,
    thresh: 0,
    x_coord: null,
    y_coord: null,
    getVertex: function(i_x_coord, i_y_coord, i_coord_len, st, ed, i_thresh) {
        this.number_of_vertex = 0;
        this.thresh = i_thresh;
        this.x_coord = i_x_coord;
        this.y_coord = i_y_coord;
        return this.get_vertex(st, ed, i_coord_len);
    }
    ,
    // alternative of the function (int * vnum], int st, int ed, double thresh, int vertex [], int y_coord [], int x_coord [) static int get_vertex
    get_vertex: function(st, ed, i_coord_len) {
        var i;
        var d;
        //Note: The coordinate values ​​change because it is okay to dealing in int32 and does not exceed 65536.
        var v1 = 0;
        var lx_coord = this.x_coord;
        var ly_coord = this.y_coord;
        var a = ly_coord[ed] - ly_coord[st];
        var b = lx_coord[st] - lx_coord[ed];
        var c = lx_coord[ed] * ly_coord[st] - ly_coord[ed] * lx_coord[st];
        var dmax = 0;
        if (st < ed) {
            //ed and st is one section
            for (i = st + 1; i < ed; i++) {
                d = a * lx_coord[i] + b * ly_coord[i] + c;
                if (d * d > dmax) {
                    dmax = d * d;
                    v1 = i;
                }
            }
        } else {
            //ed and st 2 interval
            for (i = st + 1; i < i_coord_len; i++) {
                d = a * lx_coord[i] + b * ly_coord[i] + c;
                if (d * d > dmax) {
                    dmax = d * d;
                    v1 = i;
                }
            }
            for (i = 0; i < ed; i++) {
                d = a * lx_coord[i] + b * ly_coord[i] + c;
                if (d * d > dmax) {
                    dmax = d * d;
                    v1 = i;
                }
            }
        }
        if (dmax / (a * a + b * b) > this.thresh) {
            if (!this.get_vertex(st, v1, i_coord_len)) {
                return false;
            }
            if (this.number_of_vertex > 5) {
                return false;
            }
            this.vertex[this.number_of_vertex] = v1;
            this.number_of_vertex++;
            if (!this.get_vertex(v1, ed, i_coord_len)) {
                return false;
            }
        }
        return true;
    }
});

NyARCoord2SquareVertexIndexes = ASKlass('NyARCoord2SquareVertexIndexes', {
    VERTEX_FACTOR: 1.0, // Factor of the line detection
    __getSquareVertex_wv1: new NyARVertexCounter(),
    __getSquareVertex_wv2: new NyARVertexCounter(),
    NyARCoord2SquareVertexIndexes: function() {
        return;
    }
    ,
    // From the coordinate set, looking four places where going to be a candidate vertex, and returns index number
    getVertexIndexes: function(i_x_coord, i_y_coord, i_coord_num, i_area, o_vertex) {
        var wv1 = this.__getSquareVertex_wv1;
        var wv2 = this.__getSquareVertex_wv2;
        var vertex1_index = this.getFarPoint(i_x_coord, i_y_coord, i_coord_num, 0);
        var prev_vertex_index = (vertex1_index + i_coord_num) % i_coord_num;
        var v1 = this.getFarPoint(i_x_coord, i_y_coord, i_coord_num, vertex1_index);
        var thresh = (i_area / 0.75) * 0.01 * this.VERTEX_FACTOR;
        o_vertex[0] = vertex1_index;
        if (!wv1.getVertex(i_x_coord, i_y_coord, i_coord_num, vertex1_index, v1, thresh)) {
            return false;
        }
        if (!wv2.getVertex(i_x_coord, i_y_coord, i_coord_num, v1, prev_vertex_index, thresh)) {
            return false;
        }
        var v2;
        if (wv1.number_of_vertex == 1 && wv2.number_of_vertex == 1) {
            o_vertex[1] = wv1.vertex[0];
            o_vertex[2] = v1;
            o_vertex[3] = wv2.vertex[0];
        } else if (wv1.number_of_vertex > 1 && wv2.number_of_vertex == 0) {
            // In anticipation to be in the 1/2 diagonal line between starting point and vertex position, search
            if (v1 >= vertex1_index) {
                v2 = (v1 - vertex1_index) / 2 + vertex1_index;
            } else {
                v2 = ((v1 + i_coord_num - vertex1_index) / 2 + vertex1_index) % i_coord_num;
            }
            if (!wv1.getVertex(i_x_coord, i_y_coord, i_coord_num, vertex1_index, v2, thresh)) {
                return false;
            }
            if (!wv2.getVertex(i_x_coord, i_y_coord, i_coord_num, v2, v1, thresh)) {
                return false;
            }
            if (wv1.number_of_vertex == 1 && wv2.number_of_vertex == 1) {
                o_vertex[1] = wv1.vertex[0];
                o_vertex[2] = wv2.vertex[0];
                o_vertex[3] = v1;
            } else {
                return false;
            }
        } else if (wv1.number_of_vertex == 0 && wv2.number_of_vertex > 1) {
            //v2 = (v1+ end_of_coord)/2;
            if (v1 <= prev_vertex_index) {
                v2 = (v1 + prev_vertex_index) / 2;
            } else {
                v2 = ((v1 + i_coord_num + prev_vertex_index) / 2) % i_coord_num;
            }
            if (!wv1.getVertex(i_x_coord, i_y_coord, i_coord_num, v1, v2, thresh)) {
                return false;
            }
            if (!wv2.getVertex(i_x_coord, i_y_coord, i_coord_num, v2, prev_vertex_index, thresh)) {
                return false;
            }
            if (wv1.number_of_vertex == 1 && wv2.number_of_vertex == 1) {
                o_vertex[1] = v1;
                o_vertex[2] = wv1.vertex[0];
                o_vertex[3] = wv2.vertex[0];
            } else {
                return false;
            }
        } else {
            return false;
        }
        return true;
    }
    ,
    // from the contour coordinate of i_point, look for the index of the contour coordinate in the most distant
    getFarPoint: function(i_coord_x, i_coord_y, i_coord_num, i_point) {
        var sx = i_coord_x[i_point];
        var sy = i_coord_y[i_point];
        var d = 0;
        var w, x, y;
        var ret = 0;
        var i;
        for (i = i_point + 1; i < i_coord_num; i++) {
            x = i_coord_x[i] - sx;
            y = i_coord_y[i] - sy;
            w = x * x + y * y;
            if (w > d) {
                d = w;
                ret = i;
            }
        }
        for (i = 0; i < i_point; i++) {
            x = i_coord_x[i] - sx;
            y = i_coord_y[i] - sy;
            w = x * x + y * y;
            if (w > d) {
                d = w;
                ret = i;
            }
        }
        return ret;
    }
});

NyARSquare = ASKlass('NyARSquare', {// Class corresponding to ARMarkerInfo. hold the rectangle information
    line: NyARLinear.createArray(4),
    sqvertex: NyARDoublePoint2d.createArray(4),
    getCenter2d: function(o_out) {
        o_out.x = (this.sqvertex[0].x + this.sqvertex[1].x + this.sqvertex[2].x + this.sqvertex[3].x) / 4;
        o_out.y = (this.sqvertex[0].y + this.sqvertex[1].y + this.sqvertex[2].y + this.sqvertex[3].y) / 4;
        return;
    }
});
NyARSquareContourDetector = ASKlass('NyARSquareContourDetector', {
    detectMarkerCB: function(i_raster, i_callback) {
        NyARException.trap("getRgbPixelReader not implemented.");
    }
});
NyARSquareContourDetector_IDetectMarkerCallback = ASKlass('NyARSquareContourDetector_IDetectMarkerCallback', {
    onSquareDetect: function(i_sender, i_coordx, i_coordy, i_coor_num, i_vertex_index) {
    }
});
RleLabelOverlapChecker = ASKlass('RleLabelOverlapChecker', NyARLabelOverlapChecker, {
    RleLabelOverlapChecker: function(i_max_label) {
        NyARLabelOverlapChecker.initialize.call(this, i_max_label);
    }
    , createArray: function(i_length) {
        return new Array(i_length);
    }
});
NyARSquareContourDetector_Rle = ASKlass('NyARSquareContourDetector_Rle', NyARSquareContourDetector, {
    AR_AREA_MAX: 100000, // define AR_AREA_MAX 100000
    AR_AREA_MIN: 70, // define AR_AREA_MIN 70
    _width: 0,
    _height: 0,
    _labeling: null,
    _overlap_checker: new RleLabelOverlapChecker(32),
    _cpickup: new NyARContourPickup(),
    _stack: null,
    _coord2vertex: new NyARCoord2SquareVertexIndexes(),
    _max_coord: 0,
    _xcoord: null,
    _ycoord: null
    ,
    NyARSquareContourDetector_Rle: function(i_size) { // create a class detects marker of maximum individual i_squre_max 
        this._width = i_size.w;
        this._height = i_size.h;
        //use the setAreaRange If you want to specify the size of the labeling.
        this._labeling = new NyARLabeling_Rle(this._width, this._height);
        this._labeling.setAreaRange(this.AR_AREA_MAX, this.AR_AREA_MIN);
        this._stack = new NyARRleLabelFragmentInfoStack(i_size.w * i_size.h * 2048 / (320 * 240) + 32);//検出可能な最大ラベル数
        // The maximum length of the outline rectangle the size of the maximum that can be reflected on the screen.
        var number_of_coord = (this._width + this._height) * 2;
        // Contour buffer
        this._max_coord = number_of_coord;
        this._xcoord = new IntVector(number_of_coord);
        this._ycoord = new IntVector(number_of_coord);
        return;
    },
    __detectMarker_mkvertex: new IntVector(4)
    , detectMarkerCB: function(i_raster, i_callback)
    {
        var flagment = this._stack;
        var overlap = this._overlap_checker;
        // Up to this point the number of labels is 0
        var label_num = this._labeling.labeling_NyARBinRaster(i_raster, 0, i_raster.getHeight(), flagment);
        if (label_num < 1) {
            return;
        }
        // keep sort the label
        flagment.sortByArea();
        // Get label list
        var labels = (flagment.getArray());
        var xsize = this._width;
        var ysize = this._height;
        var xcoord = this._xcoord;
        var ycoord = this._ycoord;
        var coord_max = this._max_coord;
        var mkvertex = this.__detectMarker_mkvertex;
        // Set the maximum number of overlapping checker
        overlap.setMaxLabels(label_num);
        for (var i = 0; i < label_num; i++) {
            var label_pt = labels[i];
            var label_area = label_pt.area;
            // Exclusion clip region if in contact with the frame of the screen
            if (label_pt.clip_l == 0 || label_pt.clip_r == xsize - 1) {
                continue;
            }
            if (label_pt.clip_t == 0 || label_pt.clip_b == ysize - 1) {
                continue;
            }

            if (!overlap.check(label_pt)) { // Check the overlap of detected rectangle
                // Seems to overlap
                continue;
            }
            // Get the outline
            var coord_num = _cpickup.getContour_NyARBinRaster(i_raster, label_pt.entry_x, label_pt.clip_t, coord_max, xcoord, ycoord);
            if (coord_num == coord_max) { // Outline is too large.                
                continue;
            }
            // Check the contour, and determining whether the rectangle. Get to mkvertex if rectangular
            if (!this._coord2vertex.getVertexIndexes(xcoord, ycoord, coord_num, label_area, mkvertex)) {
                // could not get the vertex
                continue;
            }

            i_callback.onSquareDetect(this, xcoord, ycoord, coord_num, mkvertex); // callback that found rectangle

            overlap.push(label_pt); // add to the overlap check the label belonged rectangular Discovered.
        }
        return;
    }
});

NyARSquareStack = ASKlass('NyARSquareStack', NyARObjectStack, {
    NyARSquareStack: function(i_length) {
        NyARObjectStack.initialize.call(this, i_length);
    }
    ,
    createArray: function(i_length) {
        var ret = new Array(i_length);
        for (var i = 0; i < i_length; i++) {
            ret[i] = new NyARSquare();
        }
        return (ret);
    }
});

FLARSquare = NyARSquare;
Cxdir = new IntVector([0, 1, 1, 1, 0, -1, -1, -1]);
Cydir = new IntVector([-1, -1, 0, 1, 1, 1, 0, -1]);
FLContourPickup = ASKlass('FLContourPickup', NyARContourPickup, {
    FLContourPickup: function() {
    }
    ,
    getContour_FLARBinRaster: function(i_raster, i_entry_x, i_entry_y, i_array_size, o_coord_x, o_coord_y) {
        var xdir = this._getContour_xdir;// static int xdir[8] = { 0, 1, 1, 1, 0,-1,-1,-1};
        var ydir = this._getContour_ydir;// static int ydir[8] = {-1,-1, 0, 1, 1, 1, 0,-1};
        var i_buf = i_raster.getBuffer();
        var width = i_raster.getWidth();
        var height = i_raster.getHeight();
        // get the point that is in contact with the upper end of the clip region.
        var coord_num = 1;
        o_coord_x[0] = i_entry_x;
        o_coord_y[0] = i_entry_y;
        var dir = 5; //cinco
        var c = i_entry_x;
        var r = i_entry_y;
        for (; ; ) {
            dir = (dir + 5) % 8; // normalization of dir //cinco
            // that it can be optimized more if you work hard here.
            // In case of boundary of the ground other than the four corners, not be such as bounds checking
            if (c >= 1 && c < width - 1 && r >= 1 && r < height - 1) {
                for (; ; ) { // for statement of emulating the goto
                    // When it is not in contact with the boundary (decision point dark)
                    if (i_buf.getPixel(c + xdir[dir], r + ydir[dir]) > 0) {
                        break;
                    }
                    dir++;
                    if (i_buf.getPixel(c + xdir[dir], r + ydir[dir]) > 0) {
                        break;
                    }
                    dir++;
                    if (i_buf.getPixel(c + xdir[dir], r + ydir[dir]) > 0) {
                        break;
                    }
                    dir++;
                    if (i_buf.getPixel(c + xdir[dir], r + ydir[dir]) > 0) {
                        break;
                    }
                    dir++;
                    if (i_buf.getPixel(c + xdir[dir], r + ydir[dir]) > 0) {
                        break;
                    }
                    dir++;
                    if (i_buf.getPixel(c + xdir[dir], r + ydir[dir]) > 0) {
                        break;
                    }
                    dir++;
                    if (i_buf.getPixel(c + xdir[dir], r + ydir[dir]) > 0) {
                        break;
                    }
                    dir++;
                    if (i_buf.getPixel(c + xdir[dir], r + ydir[dir]) > 0) {
                        break;
                    }
                    // Were examined all eight directions, but is does not have a label?
                    return -1;
                }
            } else {
                // When are in contact with the boundary
                var i;
                for (i = 0; i < 8; i++) {
                    var x = c + xdir[dir];
                    var y = r + ydir[dir];
                    // Bounds checking
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        if (i_buf.getPixel(y, x) > 0) {
                            break;
                        }
                    }
                    dir++; // No problem since you will want to refer to the double-length table
                }
                if (i == 8) { // Were examined all eight directions, but is does not have a label?                    
                    return -1;
                }
            }
            dir = dir % 8; // normalization of dir
            // Save c, to the r ycoord and xcoord
            c = c + xdir[dir];
            r = r + ydir[dir];
            o_coord_x[coord_num] = c;
            o_coord_y[coord_num] = r;
            // Exit condition determination
            if (c == i_entry_x && r == i_entry_y) {
                coord_num++;
                break;
            }
            coord_num++;
            if (coord_num == i_array_size) {// Profile has reached the end                
                return coord_num;
            }
        }
        return coord_num;
    }
});

FLARSquareContourDetector = ASKlass('FLARSquareContourDetector', NyARSquareContourDetector, {
    AR_AREA_MAX: 100000, // define AR_AREA_MAX 100000
    AR_AREA_MIN: 70, // define AR_AREA_MIN 70
    _width: 0,
    _height: 0,
    _labeling: null, _overlap_checker: new NyARLabelOverlapChecker(32),
    _cpickup: new FLContourPickup(),
    _stack: null,
    _coord2vertex: new NyARCoord2SquareVertexIndexes(),
    _max_coord: 0,
    _xcoord: null,
    _ycoord: null
    ,
    FLARSquareContourDetector: function(i_size) { // detects the marker of maximum i_squre_max individual
        this._width = i_size.w;
        this._height = i_size.h;
        // use the setAreaRange If you want to specify the size of the labeling.
        this._labeling = new NyARLabeling_Rle(this._width, this._height);
        this._stack = new NyARRleLabelFragmentInfoStack(i_size.w * i_size.h * 2048 / (320 * 240) + 32);//Detect maximum number of labels
        // The maximum length of the outline rectangle the size of the maximum that can be reflected on the screen.
        var number_of_coord = (this._width + this._height) * 2;
        // Contour buffer
        this._max_coord = number_of_coord;
        this._xcoord = new IntVector(number_of_coord);
        this._ycoord = new IntVector(number_of_coord);
        return;
    }
    ,
    // Inspected the size of the white area
    // About 320px one side, the minimum size has been analyzed up to about 8px one side maximum size
    // The object to be analyzed and, if it is within the above range in the analysis image, but a minimum size does not make sense to be too small

    //(The square of one side)
    // i_max = maximum number of white pixel area to be analyzed
    // i_min = and the minimum number of white pixel area to be analyzed
    setAreaRange: function(i_max, i_min) {
        this._labeling.setAreaRange(i_max, i_min);
    },
    __detectMarker_mkvertex: new IntVector(4)
    ,
    detectMarkerCB: function(i_raster, i_callback) {
        var flagment = this._stack;
        var overlap = this._overlap_checker;
        // Up to this point the number of labels is 0
        var label_num = this._labeling.labeling(i_raster, flagment);
        if (label_num < 1) {
            return;
        }
        flagment.sortByArea(); // I keep sort the label
        // Get the label list
        var labels = flagment.getArray();
        var xsize = this._width;
        var ysize = this._height;
        var xcoord = this._xcoord;
        var ycoord = this._ycoord;
        var coord_max = this._max_coord;
        var mkvertex = this.__detectMarker_mkvertex;
        // Set the maximum number of overlapping checker
        overlap.setMaxLabels(label_num);
        for (var i = 0; i < label_num; i++) {
            var label_pt = labels[i];
            var label_area = label_pt.area;
            // Exclusion clip region if in contact with the frame of the screen
            if (label_pt.clip_l == 0 || label_pt.clip_r == xsize - 1) {
                continue;
            }
            if (label_pt.clip_t == 0 || label_pt.clip_b == ysize - 1) {
                continue;
            }
            // Check the overlap of the rectangle has already been detected
            if (!overlap.check(label_pt)) {
                // Seems to overlap.
                continue;
            }
            if (window.DEBUG) {
                var cv = document.getElementById('debugCanvas').getContext('2d');
                cv.strokeStyle = 'red';
                cv.strokeRect(label_pt.clip_l, label_pt.clip_t, label_pt.clip_r - label_pt.clip_l, label_pt.clip_b - label_pt.clip_t);
                cv.fillStyle = 'red';
                cv.fillRect(label_pt.entry_x - 1, label_pt.clip_t - 1, 3, 3);
                cv.fillStyle = 'cyan';
                cv.fillRect(label_pt.pos_x - 1, label_pt.pos_y - 1, 3, 3);
            }
            // Get the outline
            var coord_num = this._cpickup.getContour_FLARBinRaster(i_raster, label_pt.entry_x, label_pt.clip_t, coord_max, xcoord, ycoord);
            if (coord_num == -1)
                return -1;
            if (coord_num == coord_max) { // Outline is too large.                
                continue;
            }
            // Check the contour, and determining whether the rectangle. Get to mkvertex if rectangular
            var vertex = this._coord2vertex.getVertexIndexes(xcoord, ycoord, coord_num, label_area, mkvertex);
            if (!vertex) { // could not get the vertex                
                continue;
            }
            // notification callback function that it has found a rectangle
            i_callback.onSquareDetect(this, xcoord, ycoord, coord_num, mkvertex);
            // add to the overlap check the label belonged rectangular Discovered
            overlap.push(label_pt);
        }
        return;
    }
});

// This class calculates ARMatrix from square information. -- compute the transformation matrix
INyARTransMat = Klass({
    transMat: function(i_square, i_offset, o_result) {
    },
    transMatContinue: function(i_square, i_offset, io_result_conv) {
    }
});

NyARRectOffset = ASKlass('NyARRectOffset', { // store the vertex information of the rectangle.

    vertex: NyARDoublePoint3d.createArray(4),
    createArray: function(i_number) {
        var ret = new Array(i_number);
        for (var i = 0; i < i_number; i++) {
            ret[i] = new NyARRectOffset();
        }
        return ret;
    },
    // Side length from the center position, you need to configure and create the offset information.
    setSquare: function(i_width) {
        var w_2 = i_width / 2.0;
        var vertex3d_ptr;
        vertex3d_ptr = this.vertex[0];
        vertex3d_ptr.x = -w_2;
        vertex3d_ptr.y = w_2;
        vertex3d_ptr.z = 0.0;
        vertex3d_ptr = this.vertex[1];
        vertex3d_ptr.x = w_2;
        vertex3d_ptr.y = w_2;
        vertex3d_ptr.z = 0.0;
        vertex3d_ptr = this.vertex[2];
        vertex3d_ptr.x = w_2;
        vertex3d_ptr.y = -w_2;
        vertex3d_ptr.z = 0.0;
        vertex3d_ptr = this.vertex[3];
        vertex3d_ptr.x = -w_2;
        vertex3d_ptr.y = -w_2;
        vertex3d_ptr.z = 0.0;
        return;
    }
});

NyARTransMat = ASKlass('NyARTransMat', INyARTransMat, {// class calculates ARMatrix from square information and holds it
    _projection_mat_ref: null,
    _rotmatrix: null,
    _transsolver: null,
    _mat_optimize: null,
    _ref_dist_factor: null,
    NyARTransMat: function(i_param) {
        var dist = i_param.getDistortionFactor();
        var pmat = i_param.getPerspectiveProjectionMatrix();
        this._transsolver = new NyARTransportVectorSolver(pmat, 4);
        // If compatibility is important, and to use the NyARRotMatrix_ARToolKit.
        // The theory NyARRotMatrix_NyARToolKit and NyARRotMatrix_ARToolKit is the same, 
        // but value is shifted only slightly
        this._rotmatrix = new NyARRotMatrix(pmat);
        this._mat_optimize = new NyARPartialDifferentiationOptimize(pmat);
        this._ref_dist_factor = dist;
        this._projection_mat_ref = pmat;
        this.__transMat_vertex_2d = NyARDoublePoint2d.createArray(4);
        this.__transMat_vertex_3d = NyARDoublePoint3d.createArray(4);
        this.__transMat_trans = new NyARDoublePoint3d();
        this.__rot = new NyARDoubleMatrix33();
    }
    ,
    makeErrThreshold: function(i_vertex) { // Based on the vertex information, calculate the error threshold.
        var a, b, l1, l2;
        a = i_vertex[0].x - i_vertex[2].x;
        b = i_vertex[0].y - i_vertex[2].y;
        l1 = a * a + b * b;
        a = i_vertex[1].x - i_vertex[3].x;
        b = i_vertex[1].y - i_vertex[3].y;
        l2 = a * a + b * b;
        return (Math.sqrt(l1 > l2 ? l1 : l2)) / 200;
    }
    ,
    // double arGetTransMat( ARMarkerInfo *marker_info,double center[2], double width, double conv[3][4] )
    // @param i_square = * NyARSquare object to be calculated
    transMat: function(i_square, i_offset, o_result_conv) {
        var trans = this.__transMat_trans;
        var err_threshold = this.makeErrThreshold(i_square.sqvertex);
        // The amount of translation computer, and set the 2D coordinate system
        var vertex_2d = this.__transMat_vertex_2d;
        var vertex_3d = this.__transMat_vertex_3d;
        this._ref_dist_factor.ideal2ObservBatch(i_square.sqvertex, vertex_2d, 4);
        this._transsolver.set2dVertex(vertex_2d, 4);
        // Calculate the rotation matrix
        this._rotmatrix.initRotBySquare(i_square.line, i_square.sqvertex);
        // From the 3D coordinate system after the rotation, and calculate the amount of translation
        this._rotmatrix.getPoint3dBatch(i_offset.vertex, vertex_3d, 4);
        this._transsolver.solveTransportVector(vertex_3d, trans);
        // (Optimization of the rotation matrix and the amount of translation) optimization of the calculation results
        o_result_conv.error = this.optimize(this._rotmatrix, trans, this._transsolver, i_offset.vertex, vertex_2d, err_threshold);
        // Save matrix
        this.updateMatrixValue(this._rotmatrix, trans, o_result_conv);
        return;
    },
    // (non-Javadoc)
    // @see jp.nyatla.nyartoolkit.core.transmat.INyARTransMat#transMatContinue(jp.nyatla.nyartoolkit.core.NyARSquare, int, double, jp.nyatla.nyartoolkit.core.transmat.NyARTransMatResult)
    transMatContinue: function(i_square, i_offset, o_result_conv) {
        var trans = this.__transMat_trans;
        // io_result_conv If the initial value, calculated in transMat.
        if (!o_result_conv.has_value) {
            this.transMat(i_square, i_offset, o_result_conv);
            return;
        }
        // To determine the threshold of optimization calculation
        var err_threshold = this.makeErrThreshold(i_square.sqvertex);
        // The amount of translation computer, and set the 2D coordinate system
        var vertex_2d = this.__transMat_vertex_2d;
        var vertex_3d = this.__transMat_vertex_3d;
        this._ref_dist_factor.ideal2ObservBatch(i_square.sqvertex, vertex_2d, 4);
        this._transsolver.set2dVertex(vertex_2d, 4);
        // Calculate the rotation matrix
        this._rotmatrix.initRotByPrevResult(o_result_conv);
        // From the 3D coordinate system after the rotation, and calculate the amount of translation
        this._rotmatrix.getPoint3dBatch(i_offset.vertex, vertex_3d, 4);
        this._transsolver.solveTransportVector(vertex_3d, trans);
        // keep to calculate the error rate of the current
        var min_err = this.errRate(this._rotmatrix, trans, i_offset.vertex, vertex_2d, 4, vertex_3d);
        var rot = this.__rot;
        // Again the error rate is greater than the last threshold error value
        if (min_err < o_result_conv.error + err_threshold) {
            rot.setValue_NyARDoubleMatrix33(this._rotmatrix);
            // Try to optimization.
            for (var i = 0; i < 5; i++) { //cinco
                // Optimization of the transformation matrix
                this._mat_optimize.modifyMatrix(rot, trans, i_offset.vertex, vertex_2d, 4);
                var err = this.errRate(rot, trans, i_offset.vertex, vertex_2d, 4, vertex_3d);
//                console.log("E: " + err);
                if (min_err - err < err_threshold / 2) {
//                    console.log("break");
                    break;
                }
                this._transsolver.solveTransportVector(vertex_3d, trans);
                this._rotmatrix.setValue_NyARDoubleMatrix33(rot);
                min_err = err;
            }
            this.updateMatrixValue(this._rotmatrix, trans, o_result_conv);

        } else {
            // Calculate the rotation matrix
            this._rotmatrix.initRotBySquare(i_square.line, i_square.sqvertex);
            // From the 3D coordinate system after the rotation, and calculate the amount of translation
            this._rotmatrix.getPoint3dBatch(i_offset.vertex, vertex_3d, 4);
            this._transsolver.solveTransportVector(vertex_3d, trans);
            // (Optimization of the rotation matrix and the amount of translation) optimization of the calculation results
            min_err = this.optimize(this._rotmatrix, trans, this._transsolver, i_offset.vertex, vertex_2d, err_threshold);
            this.updateMatrixValue(this._rotmatrix, trans, o_result_conv);
        }
        o_result_conv.error = min_err;
        return;
    }
    ,
    optimize: function(io_rotmat, io_transvec, i_solver, i_offset_3d, i_2d_vertex, i_err_threshold) {
        console.log("START");
        var vertex_3d = this.__transMat_vertex_3d;
        // Calculate the value of the initial error
        var min_err = this.errRate(io_rotmat, io_transvec, i_offset_3d, i_2d_vertex, 4, vertex_3d);
        var rot = this.__rot;
        rot.setValue_NyARDoubleMatrix33(io_rotmat);
        for (var i = 0; i < 5; i++) { //cinco
            // Optimization of the transformation matrix
            this._mat_optimize.modifyMatrix(rot, io_transvec, i_offset_3d, i_2d_vertex, 4);
            var err = this.errRate(rot, io_transvec, i_offset_3d, i_2d_vertex, 4, vertex_3d);
            console.log("E: " + err);
            if (min_err - err < i_err_threshold) {
                console.log("BREAK");
                break;
            }
            i_solver.solveTransportVector(vertex_3d, io_transvec);
            io_rotmat.setValue_NyARDoubleMatrix33(rot);
            min_err = err;
        }
        console.log("END");
        return min_err;
    },
    // Error rate calculator
    errRate: function(io_rot, i_trans, i_vertex3d, i_vertex2d, i_number_of_vertex, o_rot_vertex) {
        var cp = this._projection_mat_ref;
        var cp00 = cp.m00;
        var cp01 = cp.m01;
        var cp02 = cp.m02;
        var cp11 = cp.m11;
        var cp12 = cp.m12;
        var err = 0;
        for (var i = 0; i < i_number_of_vertex; i++) {
            var x3d, y3d, z3d;
            o_rot_vertex[i].x = x3d = io_rot.m00 * i_vertex3d[i].x + io_rot.m01 * i_vertex3d[i].y + io_rot.m02 * i_vertex3d[i].z;
            o_rot_vertex[i].y = y3d = io_rot.m10 * i_vertex3d[i].x + io_rot.m11 * i_vertex3d[i].y + io_rot.m12 * i_vertex3d[i].z;
            o_rot_vertex[i].z = z3d = io_rot.m20 * i_vertex3d[i].x + io_rot.m21 * i_vertex3d[i].y + io_rot.m22 * i_vertex3d[i].z;
            x3d += i_trans.x;
            y3d += i_trans.y;
            z3d += i_trans.z;
            // Projective transformation
            var x2d = x3d * cp00 + y3d * cp01 + z3d * cp02;
            var y2d = y3d * cp11 + z3d * cp12;
            var h2d = z3d;
            // Error rate calculation
            var t1 = i_vertex2d[i].x - x2d / h2d;
            var t2 = i_vertex2d[i].y - y2d / h2d;
            err += t1 * t1 + t2 * t2;
        }
        return err / i_number_of_vertex;
    }
    ,
    updateMatrixValue: function(i_rot, i_trans, o_result) { // update the transformation matrix parameters
        o_result.m00 = i_rot.m00;
        o_result.m01 = i_rot.m01;
        o_result.m02 = i_rot.m02;
        o_result.m03 = i_trans.x;
        o_result.m10 = i_rot.m10;
        o_result.m11 = i_rot.m11;
        o_result.m12 = i_rot.m12;
        o_result.m13 = i_trans.y;
        o_result.m20 = i_rot.m20;
        o_result.m21 = i_rot.m21;
        o_result.m22 = i_rot.m22;
        o_result.m23 = i_trans.z;
        o_result.has_value = true;
        return;
    }
});

NyARTransMatResult = ASKlass('NyARTransMatResult', NyARDoubleMatrix34, {
    error: 0, // Error rate. INyARTransMat derived class will use this value.
    has_value: false
    ,
    getZXYAngle: function(o_out) { // This function returns a value between,0-PI.
        var sina = this.m21;
        if (sina >= 1.0) {
            o_out.x = Math.PI / 2;
            o_out.y = 0;
            o_out.z = Math.atan2(-this.m10, this.m00);
        } else if (sina <= -1.0) {
            o_out.x = -Math.PI / 2;
            o_out.y = 0;
            o_out.z = Math.atan2(-this.m10, this.m00);
        } else {
            o_out.x = Math.asin(sina);
            o_out.z = Math.atan2(-this.m01, this.m11);
            o_out.y = Math.atan2(-this.m20, this.m22);
        }
    }
    ,
    transformVertex_Number: function(i_x, i_y, i_z, o_out) {
        o_out.x = this.m00 * i_x + this.m01 * i_y + this.m02 * i_z + this.m03;
        o_out.y = this.m10 * i_x + this.m11 * i_y + this.m12 * i_z + this.m13;
        o_out.z = this.m20 * i_x + this.m21 * i_y + this.m22 * i_z + this.m23;
        return;
    }
    ,
    transformVertex_NyARDoublePoint3d: function(i_in, o_out) {
        this.transformVertex_Number(i_in.x, i_in.y, i_in.z, o_out);
    }
});

// To match the actual image and the basic position, and fine-tune the angle → recalculate the amount of translation and optimizing the transform matrix
NyARPartialDifferentiationOptimize = ASKlass('NyARPartialDifferentiationOptimize', {
    _projection_mat_ref: null
    ,
    NyARPartialDifferentiationOptimize: function(i_projection_mat_ref) {
        this._projection_mat_ref = i_projection_mat_ref;
        this.__angles_in = TSinCosValue.createArray(3);
        this.__ang = new NyARDoublePoint3d();
        this.__sin_table = new FloatVector(4);
        return;
    }
    ,
    sincos2Rotation_ZXY: function(i_sincos, i_rot_matrix) {
        var sina = i_sincos[0].sin_val;
        var cosa = i_sincos[0].cos_val;
        var sinb = i_sincos[1].sin_val;
        var cosb = i_sincos[1].cos_val;
        var sinc = i_sincos[2].sin_val;
        var cosc = i_sincos[2].cos_val;
        i_rot_matrix.m00 = cosc * cosb - sinc * sina * sinb;
        i_rot_matrix.m01 = -sinc * cosa;
        i_rot_matrix.m02 = cosc * sinb + sinc * sina * cosb;
        i_rot_matrix.m10 = sinc * cosb + cosc * sina * sinb;
        i_rot_matrix.m11 = cosc * cosa;
        i_rot_matrix.m12 = sinc * sinb - cosc * sina * cosb;
        i_rot_matrix.m20 = -cosa * sinb;
        i_rot_matrix.m21 = sina;
        i_rot_matrix.m22 = cosb * cosa;
    }
    ,
    rotation2Sincos_ZXY: function(i_rot_matrix, o_out, o_ang) {
        var x, y, z;
        var sina = i_rot_matrix.m21;
        if (sina >= 1.0) {
            x = Math.PI / 2;
            y = 0;
            z = Math.atan2(-i_rot_matrix.m10, i_rot_matrix.m00);
        } else if (sina <= -1.0) {
            x = -Math.PI / 2;
            y = 0;
            z = Math.atan2(-i_rot_matrix.m10, i_rot_matrix.m00);
        } else {
            x = Math.asin(sina);
            y = Math.atan2(-i_rot_matrix.m20, i_rot_matrix.m22);
            z = Math.atan2(-i_rot_matrix.m01, i_rot_matrix.m11);
        }
        o_ang.x = x;
        o_ang.y = y;
        o_ang.z = z;
        o_out[0].sin_val = Math.sin(x);
        o_out[0].cos_val = Math.cos(x);
        o_out[1].sin_val = Math.sin(y);
        o_out[1].cos_val = Math.cos(y);
        o_out[2].sin_val = Math.sin(z);
        o_out[2].cos_val = Math.cos(z);
        return;
    }
    ,
    optimizeParamX: function(i_angle_y, i_angle_z, i_trans, i_vertex3d, i_vertex2d, i_number_of_vertex, i_hint_angle) {
        var cp = this._projection_mat_ref;
        var sinb = i_angle_y.sin_val;
        var cosb = i_angle_y.cos_val;
        var sinc = i_angle_z.sin_val;
        var cosc = i_angle_z.cos_val;
        var L, J, K, M, N, O;
        L = J = K = M = N = O = 0;
        for (var i = 0; i < i_number_of_vertex; i++) {
            var ix, iy, iz;
            ix = i_vertex3d[i].x;
            iy = i_vertex3d[i].y;
            iz = i_vertex3d[i].z;
            var cp00 = cp.m00;
            var cp01 = cp.m01;
            var cp02 = cp.m02;
            var cp11 = cp.m11;
            var cp12 = cp.m12;
            var X0 = (cp00 * (-sinc * sinb * ix + sinc * cosb * iz) + cp01 * (cosc * sinb * ix - cosc * cosb * iz) + cp02 * (iy));
            var X1 = (cp00 * (-sinc * iy) + cp01 * ((cosc * iy)) + cp02 * (-sinb * ix + cosb * iz));
            var X2 = (cp00 * (i_trans.x + cosc * cosb * ix + cosc * sinb * iz) + cp01 * ((i_trans.y + sinc * cosb * ix + sinc * sinb * iz)) + cp02 * (i_trans.z));
            var Y0 = (cp11 * (cosc * sinb * ix - cosc * cosb * iz) + cp12 * (iy));
            var Y1 = (cp11 * ((cosc * iy)) + cp12 * (-sinb * ix + cosb * iz));
            var Y2 = (cp11 * ((i_trans.y + sinc * cosb * ix + sinc * sinb * iz)) + cp12 * (i_trans.z));
            var H0 = (iy);
            var H1 = (-sinb * ix + cosb * iz);
            var H2 = i_trans.z;
            var VX = i_vertex2d[i].x;
            var VY = i_vertex2d[i].y;
            var a, b, c, d, e, f;
            a = (VX * H0 - X0);
            b = (VX * H1 - X1);
            c = (VX * H2 - X2);
            d = (VY * H0 - Y0);
            e = (VY * H1 - Y1);
            f = (VY * H2 - Y2);
            L += d * e + a * b;
            N += d * d + a * a;
            J += d * f + a * c;
            M += e * e + b * b;
            K += e * f + b * c;
            O += f * f + c * c;
        }
        L *= 2;
        J *= 2;
        K *= 2;
        return this.getMinimumErrorAngleFromParam(L, J, K, M, N, O, i_hint_angle);
    }
    ,
    optimizeParamY: function(i_angle_x, i_angle_z, i_trans, i_vertex3d, i_vertex2d, i_number_of_vertex, i_hint_angle) {
        var cp = this._projection_mat_ref;
        var sina = i_angle_x.sin_val;
        var cosa = i_angle_x.cos_val;
        var sinc = i_angle_z.sin_val;
        var cosc = i_angle_z.cos_val;
        var L, J, K, M, N, O;
        L = J = K = M = N = O = 0;
        for (var i = 0; i < i_number_of_vertex; i++) {
            var ix, iy, iz;
            ix = i_vertex3d[i].x;
            iy = i_vertex3d[i].y;
            iz = i_vertex3d[i].z;
            var cp00 = cp.m00;
            var cp01 = cp.m01;
            var cp02 = cp.m02;
            var cp11 = cp.m11;
            var cp12 = cp.m12;
            var X0 = (cp00 * (-sinc * sina * ix + cosc * iz) + cp01 * (cosc * sina * ix + sinc * iz) + cp02 * (-cosa * ix));
            var X1 = (cp01 * (sinc * ix - cosc * sina * iz) + cp00 * (cosc * ix + sinc * sina * iz) + cp02 * (cosa * iz));
            var X2 = (cp00 * (i_trans.x + (-sinc * cosa) * iy) + cp01 * (i_trans.y + (cosc * cosa) * iy) + cp02 * (i_trans.z + (sina) * iy));
            var Y0 = (cp11 * (cosc * sina * ix + sinc * iz) + cp12 * (-cosa * ix));
            var Y1 = (cp11 * (sinc * ix - cosc * sina * iz) + cp12 * (cosa * iz));
            var Y2 = (cp11 * (i_trans.y + (cosc * cosa) * iy) + cp12 * (i_trans.z + (sina) * iy));
            var H0 = (-cosa * ix);
            var H1 = (cosa * iz);
            var H2 = i_trans.z + (sina) * iy;
            var VX = i_vertex2d[i].x;
            var VY = i_vertex2d[i].y;
            var a, b, c, d, e, f;
            a = (VX * H0 - X0);
            b = (VX * H1 - X1);
            c = (VX * H2 - X2);
            d = (VY * H0 - Y0);
            e = (VY * H1 - Y1);
            f = (VY * H2 - Y2);
            L += d * e + a * b;
            N += d * d + a * a;
            J += d * f + a * c;
            M += e * e + b * b;
            K += e * f + b * c;
            O += f * f + c * c;
        }
        L *= 2;
        J *= 2;
        K *= 2;
        return this.getMinimumErrorAngleFromParam(L, J, K, M, N, O, i_hint_angle);
    }
    ,
    optimizeParamZ: function(i_angle_x, i_angle_y, i_trans, i_vertex3d, i_vertex2d, i_number_of_vertex, i_hint_angle) {
        var cp = this._projection_mat_ref;
        var sina = i_angle_x.sin_val;
        var cosa = i_angle_x.cos_val;
        var sinb = i_angle_y.sin_val;
        var cosb = i_angle_y.cos_val;
        var L, J, K, M, N, O;
        L = J = K = M = N = O = 0;
        for (var i = 0; i < i_number_of_vertex; i++) {
            var ix, iy, iz;
            ix = i_vertex3d[i].x;
            iy = i_vertex3d[i].y;
            iz = i_vertex3d[i].z;
            var cp00 = cp.m00;
            var cp01 = cp.m01;
            var cp02 = cp.m02;
            var cp11 = cp.m11;
            var cp12 = cp.m12;
            var X0 = (cp00 * (-sina * sinb * ix - cosa * iy + sina * cosb * iz) + cp01 * (ix * cosb + sinb * iz));
            var X1 = (cp01 * (sina * ix * sinb + cosa * iy - sina * iz * cosb) + cp00 * (cosb * ix + sinb * iz));
            var X2 = cp00 * i_trans.x + cp01 * (i_trans.y) + cp02 * (-cosa * sinb) * ix + cp02 * (sina) * iy + cp02 * ((cosb * cosa) * iz + i_trans.z);
            var Y0 = cp11 * (ix * cosb + sinb * iz);
            var Y1 = cp11 * (sina * ix * sinb + cosa * iy - sina * iz * cosb);
            var Y2 = (cp11 * i_trans.y + cp12 * (-cosa * sinb) * ix + cp12 * ((sina) * iy + (cosb * cosa) * iz + i_trans.z));
            var H0 = 0;
            var H1 = 0;
            var H2 = ((-cosa * sinb) * ix + (sina) * iy + (cosb * cosa) * iz + i_trans.z);
            var VX = i_vertex2d[i].x;
            var VY = i_vertex2d[i].y;
            var a, b, c, d, e, f;
            a = (VX * H0 - X0);
            b = (VX * H1 - X1);
            c = (VX * H2 - X2);
            d = (VY * H0 - Y0);
            e = (VY * H1 - Y1);
            f = (VY * H2 - Y2);
            L += d * e + a * b;
            N += d * d + a * a;
            J += d * f + a * c;
            M += e * e + b * b;
            K += e * f + b * c;
            O += f * f + c * c;
        }
        L *= 2;
        J *= 2;
        K *= 2;
        return this.getMinimumErrorAngleFromParam(L, J, K, M, N, O, i_hint_angle);
    }
    ,
    modifyMatrix: function(io_rot, i_trans, i_vertex3d, i_vertex2d, i_number_of_vertex) {
        var angles_in = this.__angles_in; // x,y,z
        var ang = this.__ang;
        // Extract sin / cos value of ZXY system
        this.rotation2Sincos_ZXY(io_rot, angles_in, ang);
        ang.x += this.optimizeParamX(angles_in[1], angles_in[2], i_trans, i_vertex3d, i_vertex2d, i_number_of_vertex, ang.x);
        ang.y += this.optimizeParamY(angles_in[0], angles_in[2], i_trans, i_vertex3d, i_vertex2d, i_number_of_vertex, ang.y);
        ang.z += this.optimizeParamZ(angles_in[0], angles_in[1], i_trans, i_vertex3d, i_vertex2d, i_number_of_vertex, ang.z);
        io_rot.setZXYAngle_Number(ang.x, ang.y, ang.z);
        return;
    }
    ,
    getMinimumErrorAngleFromParam: function(iL, iJ, iK, iM, iN, iO, i_hint_angle) { //get point which error rate is minimized
        var sin_table = this.__sin_table;
        var M = (iN - iM) / iL;
        var J = iJ / iL;
        var K = -iK / iL;
        // Create a table from the parameter sin
        var number_of_sin = NyAREquationSolver.solve4Equation(-4 * M * M - 4, 4 * K - 4 * J * M, 4 * M * M - (K * K - 4) - J * J, 4 * J * M - 2 * K, J * J - 1, sin_table);
        // keep getting the two minimum value.
        var min_ang_0 = Number.MAX_VALUE;
        var min_ang_1 = Number.MAX_VALUE;
        var min_err_0 = Number.MAX_VALUE;
        var min_err_1 = Number.MAX_VALUE;
        for (var i = 0; i < number_of_sin; i++) {
            // +-cos_v[i] vertex candidate
            var sin_rt = sin_table[i];
            var cos_rt = Math.sqrt(1 - (sin_rt * sin_rt));
            // Repair cos. Closer to 0 correct answers in the differential equation
            var a1 = 2 * cos_rt * sin_rt * M + sin_rt * (K - sin_rt) + cos_rt * (cos_rt + J);
            var a2 = 2 * (-cos_rt) * sin_rt * M + sin_rt * (K - sin_rt) + (-cos_rt) * ((-cos_rt) + J);
            // The cure to the absolute value, to keep getting cos value of true
            a1 = a1 < 0 ? -a1 : a1;
            a2 = a2 < 0 ? -a2 : a2;
            cos_rt = (a1 < a2) ? cos_rt : -cos_rt;
            var ang = Math.atan2(sin_rt, cos_rt);
            // Calculate the error value
            var err = iN * sin_rt * sin_rt + (iL * cos_rt + iJ) * sin_rt + iM * cos_rt * cos_rt + iK * cos_rt + iO;
            // earn a minimum of two.
            if (min_err_0 > err) {
                min_err_1 = min_err_0;
                min_ang_1 = min_ang_0;
                min_err_0 = err;
                min_ang_0 = ang;
            } else if (min_err_1 > err) {
                min_err_1 = err;
                min_ang_1 = ang;
            }
        }
        // Test [0]
        var gap_0;
        gap_0 = min_ang_0 - i_hint_angle;
        if (gap_0 > Math.PI) {
            gap_0 = (min_ang_0 - Math.PI * 2) - i_hint_angle;
        } else if (gap_0 < -Math.PI) {
            gap_0 = (min_ang_0 + Math.PI * 2) - i_hint_angle;
        }
        // Test [1]
        var gap_1;
        gap_1 = min_ang_1 - i_hint_angle;
        if (gap_1 > Math.PI) {
            gap_1 = (min_ang_1 - Math.PI * 2) - i_hint_angle;
        } else if (gap_1 < -Math.PI) {
            gap_1 = (min_ang_1 + Math.PI * 2) - i_hint_angle;
        }
        return Math.abs(gap_1) < Math.abs(gap_0) ? gap_1 : gap_0;
    }
});

TSinCosValue = ASKlass('TSinCosValue', {
    cos_val: 0,
    sin_val: 0,
    createArray: function(i_size) {
        var result = new Array(i_size);
        for (var i = 0; i < i_size; i++) {
            result[i] = new TSinCosValue();
        }
        return result;
    }
});

NyARRotMatrix = ASKlass('NyARRotMatrix', NyARDoubleMatrix33, {// Of rotation matrix calculation, 3x3 matrix
    NyARRotMatrix: function(i_matrix) { // will prepare the instance
        this.__initRot_vec1 = new NyARRotVector(i_matrix);
        this.__initRot_vec2 = new NyARRotVector(i_matrix);
        return;
    },
    __initRot_vec1: null,
    __initRot_vec2: null,
    // will restore the NyARRotMatrix from the contents of NyARTransMatResult.
    initRotByPrevResult: function(i_prev_result) {
        this.m00 = i_prev_result.m00;
        this.m01 = i_prev_result.m01;
        this.m02 = i_prev_result.m02;
        this.m10 = i_prev_result.m10;
        this.m11 = i_prev_result.m11;
        this.m12 = i_prev_result.m12;
        this.m20 = i_prev_result.m20;
        this.m21 = i_prev_result.m21;
        this.m22 = i_prev_result.m22;
        return;
    },
    initRotBySquare: function(i_linear, i_sqvertex) {
        var vec1 = this.__initRot_vec1;
        var vec2 = this.__initRot_vec2;
        // From the opposite side, to calculate the two vectors
        // Axis 1
        vec1.exteriorProductFromLinear(i_linear[0], i_linear[2]);
        vec1.checkVectorByVertex(i_sqvertex[0], i_sqvertex[1]);
        // Axis 2
        vec2.exteriorProductFromLinear(i_linear[1], i_linear[3]);
        vec2.checkVectorByVertex(i_sqvertex[3], i_sqvertex[0]);
        // Optimization of the rotation?
        NyARRotVector.checkRotation(vec1, vec2);
        this.m00 = vec1.v1;
        this.m10 = vec1.v2;
        this.m20 = vec1.v3;
        this.m01 = vec2.v1;
        this.m11 = vec2.v2;
        this.m21 = vec2.v3;
        // Calculate the last axis
        var w02 = vec1.v2 * vec2.v3 - vec1.v3 * vec2.v2;
        var w12 = vec1.v3 * vec2.v1 - vec1.v1 * vec2.v3;
        var w22 = vec1.v1 * vec2.v2 - vec1.v2 * vec2.v1;
        var w = Math.sqrt(w02 * w02 + w12 * w12 + w22 * w22);
        this.m02 = w02 / w;
        this.m12 = w12 / w;
        this.m22 = w22 / w;
        return;
    },
    // coordinate transformation in the transformation matrix i_in_point.
    getPoint3d: function(i_in_point, i_out_point) {
        var x = i_in_point.x;
        var y = i_in_point.y;
        var z = i_in_point.z;
        i_out_point.x = this.m00 * x + this.m01 * y + this.m02 * z;
        i_out_point.y = this.m10 * x + this.m11 * y + this.m12 * z;
        i_out_point.z = this.m20 * x + this.m21 * y + this.m22 * z;
        return;
    },
    // To convert a batch of multiple vertices
    getPoint3dBatch: function(i_in_point, i_out_point, i_number_of_vertex) {
        for (var i = i_number_of_vertex - 1; i >= 0; i--) {
            var out_ptr = i_out_point[i];
            var in_ptr = i_in_point[i];
            var x = in_ptr.x;
            var y = in_ptr.y;
            var z = in_ptr.z;
            out_ptr.x = this.m00 * x + this.m01 * y + this.m02 * z;
            out_ptr.y = this.m10 * x + this.m11 * y + this.m12 * z;
            out_ptr.z = this.m20 * x + this.m21 * y + this.m22 * z;
        }
        return;
    }
});

NyARRotVector = ASKlass('NyARRotVector', {
    // public member who
    v1: 0,
    v2: 0,
    v3: 0,
    // private members who
    _projection_mat_ref: null,
    _inv_cpara_array_ref: null,
    NyARRotVector: function(i_cmat) {
        var mat_a = new NyARMat(3, 3);
        var a_array = mat_a.getArray();
        a_array[0][0] = i_cmat.m00;
        a_array[0][1] = i_cmat.m01;
        a_array[0][2] = i_cmat.m02;
        a_array[1][0] = i_cmat.m10;
        a_array[1][1] = i_cmat.m11;
        a_array[1][2] = i_cmat.m12;
        a_array[2][0] = i_cmat.m20;
        a_array[2][1] = i_cmat.m21;
        a_array[2][2] = i_cmat.m22;
        mat_a.matrixSelfInv();
        this._projection_mat_ref = i_cmat;
        this._inv_cpara_array_ref = mat_a.getArray();
        // If the language is not GC, I own right transfer of the array here!
    }
    ,
    // I think it's ... to calculate the vector perpendicular to the two lines.
    exteriorProductFromLinear: function(i_linear1, i_linear2) {
        // First line
        var cmat = this._projection_mat_ref;
        var w1 = i_linear1.dy * i_linear2.dx - i_linear2.dy * i_linear1.dx;
        var w2 = i_linear1.dx * i_linear2.c - i_linear2.dx * i_linear1.c;
        var w3 = i_linear1.c * i_linear2.dy - i_linear2.c * i_linear1.dy;
        var m0 = w1 * (cmat.m01 * cmat.m12 - cmat.m02 * cmat.m11) + w2 * cmat.m11 - w3 * cmat.m01;
        var m1 = -w1 * cmat.m00 * cmat.m12 + w3 * cmat.m00;
        var m2 = w1 * cmat.m00 * cmat.m11;
        var w = Math.sqrt(m0 * m0 + m1 * m1 + m2 * m2);
        this.v1 = m0 / w;
        this.v2 = m1 / w;
        this.v3 = m2 / w;
        return;
    },
    // static int check_dir( double dir[3], double st[2], double ed[2],double cpara[3][4] ) Optimize[526->468]
    // By specifying the start / end coordinates of the vector, to adjust the direction of the vector
    checkVectorByVertex: function(i_start_vertex, i_end_vertex) {
        var h;
        var inv_cpara = this._inv_cpara_array_ref;
        //final double[] world = __checkVectorByVertex_world; // [2][3];
        var world0 = inv_cpara[0][0] * i_start_vertex.x * 10.0 + inv_cpara[0][1] * i_start_vertex.y * 10.0 + inv_cpara[0][2] * 10.0;// mat_a->m[0]*st[0]*10.0+
        var world1 = inv_cpara[1][0] * i_start_vertex.x * 10.0 + inv_cpara[1][1] * i_start_vertex.y * 10.0 + inv_cpara[1][2] * 10.0;// mat_a->m[3]*st[0]*10.0+
        var world2 = inv_cpara[2][0] * i_start_vertex.x * 10.0 + inv_cpara[2][1] * i_start_vertex.y * 10.0 + inv_cpara[2][2] * 10.0;// mat_a->m[6]*st[0]*10.0+
        var world3 = world0 + this.v1;
        var world4 = world1 + this.v2;
        var world5 = world2 + this.v3;
        // </Optimize>
        //final double[] camera = __checkVectorByVertex_camera; // [2][2];
        var cmat = this._projection_mat_ref;
        h = cmat.m20 * world0 + cmat.m21 * world1 + cmat.m22 * world2;
        if (h == 0.0) {
            throw new NyARException();
        }
        var camera0 = (cmat.m00 * world0 + cmat.m01 * world1 + cmat.m02 * world2) / h;
        var camera1 = (cmat.m10 * world0 + cmat.m11 * world1 + cmat.m12 * world2) / h;
        h = cmat.m20 * world3 + cmat.m21 * world4 + cmat.m22 * world5;
        if (h == 0.0) {
            throw new NyARException();
        }
        var camera2 = (cmat.m00 * world3 + cmat.m01 * world4 + cmat.m02 * world5) / h;
        var camera3 = (cmat.m10 * world3 + cmat.m11 * world4 + cmat.m12 * world5) / h;
        var v = (i_end_vertex.x - i_start_vertex.x) * (camera2 - camera0) + (i_end_vertex.y - i_start_vertex.y) * (camera3 - camera1);
        if (v < 0) {
            this.v1 = -this.v1;
            this.v2 = -this.v2;
            this.v3 = -this.v3;
        }
    }
    ,
    checkRotation: function(io_vec1, io_vec2) { // check_rotation (double rot[2][3]) to adjust the vector
        var w;
        var f;
        var vec10 = io_vec1.v1;
        var vec11 = io_vec1.v2;
        var vec12 = io_vec1.v3;
        var vec20 = io_vec2.v1;
        var vec21 = io_vec2.v2;
        var vec22 = io_vec2.v3;
        var vec30 = vec11 * vec22 - vec12 * vec21;
        var vec31 = vec12 * vec20 - vec10 * vec22;
        var vec32 = vec10 * vec21 - vec11 * vec20;
        w = Math.sqrt(vec30 * vec30 + vec31 * vec31 + vec32 * vec32);
        if (w == 0.0) {
            throw new NyARException();
        }
        vec30 /= w;
        vec31 /= w;
        vec32 /= w;
        var cb = vec10 * vec20 + vec11 * vec21 + vec12 * vec22;
        if (cb < 0) {
            cb = -cb;
        }
        var ca = (Math.sqrt(cb + 1.0) + Math.sqrt(1.0 - cb)) * 0.5;
        if (vec31 * vec10 - vec11 * vec30 != 0.0) {
            f = 0;
        } else {
            if (vec32 * vec10 - vec12 * vec30 != 0.0) {
                w = vec11;
                vec11 = vec12;
                vec12 = w;
                w = vec31;
                vec31 = vec32;
                vec32 = w;
                f = 1;
            } else {
                w = vec10;
                vec10 = vec12;
                vec12 = w;
                w = vec30;
                vec30 = vec32;
                vec32 = w;
                f = 2;
            }
        }
        if (vec31 * vec10 - vec11 * vec30 == 0.0) {
            throw new NyARException();
        }
        var k1, k2, k3, k4;
        var a, b, c, d;
        var p1, q1, r1;
        var p2, q2, r2;
        var p3, q3, r3;
        var p4, q4, r4;
        k1 = (vec11 * vec32 - vec31 * vec12) / (vec31 * vec10 - vec11 * vec30);
        k2 = (vec31 * ca) / (vec31 * vec10 - vec11 * vec30);
        k3 = (vec10 * vec32 - vec30 * vec12) / (vec30 * vec11 - vec10 * vec31);
        k4 = (vec30 * ca) / (vec30 * vec11 - vec10 * vec31);
        a = k1 * k1 + k3 * k3 + 1;
        b = k1 * k2 + k3 * k4;
        c = k2 * k2 + k4 * k4 - 1;
        d = b * b - a * c;
        if (d < 0) {
            throw new NyARException();
        }
        r1 = (-b + Math.sqrt(d)) / a;
        p1 = k1 * r1 + k2;
        q1 = k3 * r1 + k4;
        r2 = (-b - Math.sqrt(d)) / a;
        p2 = k1 * r2 + k2;
        q2 = k3 * r2 + k4;
        if (f == 1) {
            w = q1;
            q1 = r1;
            r1 = w;
            w = q2;
            q2 = r2;
            r2 = w;
            w = vec11;
            vec11 = vec12;
            vec12 = w;
            w = vec31;
            vec31 = vec32;
            vec32 = w;
            f = 0;
        }
        if (f == 2) {
            w = p1;
            p1 = r1;
            r1 = w;
            w = p2;
            p2 = r2;
            r2 = w;
            w = vec10;
            vec10 = vec12;
            vec12 = w;
            w = vec30;
            vec30 = vec32;
            vec32 = w;
            f = 0;
        }
        if (vec31 * vec20 - vec21 * vec30 != 0.0) {
            f = 0;
        } else {
            if (vec32 * vec20 - vec22 * vec30 != 0.0) {
                w = vec21;
                vec21 = vec22;
                vec22 = w;
                w = vec31;
                vec31 = vec32;
                vec32 = w;
                f = 1;
            } else {
                w = vec20;
                vec20 = vec22;
                vec22 = w;
                w = vec30;
                vec30 = vec32;
                vec32 = w;
                f = 2;
            }
        }
        if (vec31 * vec20 - vec21 * vec30 == 0.0) {
            throw new NyARException();
        }
        k1 = (vec21 * vec32 - vec31 * vec22) / (vec31 * vec20 - vec21 * vec30);
        k2 = (vec31 * ca) / (vec31 * vec20 - vec21 * vec30);
        k3 = (vec20 * vec32 - vec30 * vec22) / (vec30 * vec21 - vec20 * vec31);
        k4 = (vec30 * ca) / (vec30 * vec21 - vec20 * vec31);
        a = k1 * k1 + k3 * k3 + 1;
        b = k1 * k2 + k3 * k4;
        c = k2 * k2 + k4 * k4 - 1;
        d = b * b - a * c;
        if (d < 0) {
            throw new NyARException();
        }
        r3 = (-b + Math.sqrt(d)) / a;
        p3 = k1 * r3 + k2;
        q3 = k3 * r3 + k4;
        r4 = (-b - Math.sqrt(d)) / a;
        p4 = k1 * r4 + k2;
        q4 = k3 * r4 + k4;
        if (f == 1) {
            w = q3;
            q3 = r3;
            r3 = w;
            w = q4;
            q4 = r4;
            r4 = w;
            w = vec21;
            vec21 = vec22;
            vec22 = w;
            w = vec31;
            vec31 = vec32;
            vec32 = w;
            f = 0;
        }
        if (f == 2) {
            w = p3;
            p3 = r3;
            r3 = w;
            w = p4;
            p4 = r4;
            r4 = w;
            w = vec20;
            vec20 = vec22;
            vec22 = w;
            w = vec30;
            vec30 = vec32;
            vec32 = w;
            f = 0;
        }
        var e1 = p1 * p3 + q1 * q3 + r1 * r3;
        if (e1 < 0) {
            e1 = -e1;
        }
        var e2 = p1 * p4 + q1 * q4 + r1 * r4;
        if (e2 < 0) {
            e2 = -e2;
        }
        var e3 = p2 * p3 + q2 * q3 + r2 * r3;
        if (e3 < 0) {
            e3 = -e3;
        }
        var e4 = p2 * p4 + q2 * q4 + r2 * r4;
        if (e4 < 0) {
            e4 = -e4;
        }
        if (e1 < e2) {
            if (e1 < e3) {
                if (e1 < e4) {
                    io_vec1.v1 = p1;
                    io_vec1.v2 = q1;
                    io_vec1.v3 = r1;
                    io_vec2.v1 = p3;
                    io_vec2.v2 = q3;
                    io_vec2.v3 = r3;
                } else {
                    io_vec1.v1 = p2;
                    io_vec1.v2 = q2;
                    io_vec1.v3 = r2;
                    io_vec2.v1 = p4;
                    io_vec2.v2 = q4;
                    io_vec2.v3 = r4;
                }
            } else {
                if (e3 < e4) {
                    io_vec1.v1 = p2;
                    io_vec1.v2 = q2;
                    io_vec1.v3 = r2;
                    io_vec2.v1 = p3;
                    io_vec2.v2 = q3;
                    io_vec2.v3 = r3;
                } else {
                    io_vec1.v1 = p2;
                    io_vec1.v2 = q2;
                    io_vec1.v3 = r2;
                    io_vec2.v1 = p4;
                    io_vec2.v2 = q4;
                    io_vec2.v3 = r4;
                }
            }
        } else {
            if (e2 < e3) {
                if (e2 < e4) {
                    io_vec1.v1 = p1;
                    io_vec1.v2 = q1;
                    io_vec1.v3 = r1;
                    io_vec2.v1 = p4;
                    io_vec2.v2 = q4;
                    io_vec2.v3 = r4;
                } else {
                    io_vec1.v1 = p2;
                    io_vec1.v2 = q2;
                    io_vec1.v3 = r2;
                    io_vec2.v1 = p4;
                    io_vec2.v2 = q4;
                    io_vec2.v3 = r4;
                }
            } else {
                if (e3 < e4) {
                    io_vec1.v1 = p2;
                    io_vec1.v2 = q2;
                    io_vec1.v3 = r2;
                    io_vec2.v1 = p3;
                    io_vec2.v2 = q3;
                    io_vec2.v3 = r3;
                } else {
                    io_vec1.v1 = p2;
                    io_vec1.v2 = q2;
                    io_vec1.v3 = r2;
                    io_vec2.v1 = p4;
                    io_vec2.v2 = q4;
                    io_vec2.v3 = r4;
                }
            }
        }
        return;
    }
});

INyARTransportVectorSolver = ASKlass('INyARTransportVectorSolver', {
    set2dVertex: function(i_ref_vertex_2d, i_number_of_vertex) {
    }
    ,
    // From the three-dimensional coordinate group and the screen coordinate group, get amount of translation
    // 2d coordinate system, use the ones that set2dVertex just performed
    // @param i_vertex_2d = same as that specified in the previous call to set2dVertex
    // @param i_vertex3d = three-dimensional space coordinate group (same order as the screen coordinate group)
    solveTransportVector: function(i_vertex3d, o_transfer) {
    }
});

// get rotation matrix of the base already from [M] 3-dimensional coordinates and [b] the translation vector [T]

// Of ARToolKit augmented reality introductory programming, algorithm, is a thing of the P207

// Calculation procedure to the [A] T * [A] * [T] = [A] T * [b], the [A] * [T] = b
// calculating the [A] T * [A] = [M] in set2dVertex, and store only the information in the third column of A
// simultaneous equations [M] * [T] = [A] T * [b] in getTransportVector to obtain [T]
NyARTransportVectorSolver = ASKlass('NyARTransportVectorSolver', INyARTransportVectorSolver, {
    _cx: null,
    _cy: null,
    _projection_mat: null,
    _nmber_of_vertex: 0,
    NyARTransportVectorSolver: function(i_projection_mat_ref, i_max_vertex) {
        this._projection_mat = i_projection_mat_ref;
        this._cx = new FloatVector(i_max_vertex);
        this._cy = new FloatVector(i_max_vertex);
        return;
    },
    _a00: 0, _a01_10: 0, _a02_20: 0, _a11: 0, _a12_21: 0, _a22: 0,
    // specify the coordinate group on the screen.
    // @param i_ref_vertex_2d = point to the reference value to vertex coordinate group of on-screen distortion correction already

    set2dVertex: function(i_ref_vertex_2d, i_number_of_vertex) {
        // create a 3x3 matrix in order from the matrix of 2n * 3 and 3x2n, the least-squares method calculation
        // Cache in the third column of the matrix [A]
        var cx = this._cx;
        var cy = this._cy;
        var m22;
        var p00 = this._projection_mat.m00;
        var p01 = this._projection_mat.m01;
        var p11 = this._projection_mat.m11;
        var p12 = this._projection_mat.m12;
        var p02 = this._projection_mat.m02;
        var w1, w2, w3, w4;
        this._a00 = i_number_of_vertex * p00 * p00;
        this._a01_10 = i_number_of_vertex * p00 * p01;
        this._a11 = i_number_of_vertex * (p01 * p01 + p11 * p11);
        // Calculation of [A] T * [A]
        m22 = 0;
        w1 = w2 = 0;
        for (var i = 0; i < i_number_of_vertex; i++) {
            // keep a coordinate
            w3 = p02 - (cx[i] = i_ref_vertex_2d[i].x);
            w4 = p12 - (cy[i] = i_ref_vertex_2d[i].y);
            w1 += w3;
            w2 += w4;
            m22 += w3 * w3 + w4 * w4;
        }
        this._a02_20 = w1 * p00;
        this._a12_21 = p01 * w1 + p11 * w2;
        this._a22 = m22;
        this._nmber_of_vertex = i_number_of_vertex;
        return;
    },
    // From three-dimensional coordinate group and the screen coordinate group, calculate the amount of translation
    // 2d coordinate system, use the ones that set2dVertex just performed
    // @param i_vertex_2d = same as that specified in the previous call to set2dVertex
    // @param i_vertex3d = three-dimensional space coordinate group (same order as the screen coordinate group)
    solveTransportVector: function(i_vertex3d, o_transfer) {
        var number_of_vertex = this._nmber_of_vertex;
        var p00 = this._projection_mat.m00;
        var p01 = this._projection_mat.m01;
        var p02 = this._projection_mat.m02;
        var p11 = this._projection_mat.m11;
        var p12 = this._projection_mat.m12;
        // Cache in the third column of the matrix [A]
        var cx = this._cx;
        var cy = this._cy;
        // The adaptation to the vertices of the original coordinate the rotation matrix
        // Calculate the [A] T * [b]
        var b1, b2, b3;
        b1 = b2 = b3 = 0;
        for (var i = 0; i < number_of_vertex; i++) {
            var w1 = i_vertex3d[i].z * cx[i] - p00 * i_vertex3d[i].x - p01 * i_vertex3d[i].y - p02 * i_vertex3d[i].z;
            var w2 = i_vertex3d[i].z * cy[i] - p11 * i_vertex3d[i].y - p12 * i_vertex3d[i].z;
            b1 += w1;
            b2 += w2;
            b3 += cx[i] * w1 + cy[i] * w2;
        }
        // Calculate the [A] T * [b]
        b3 = p02 * b1 + p12 * b2 - b3; // No good I have switched to order
        b2 = p01 * b1 + p11 * b2;
        b1 = p00 * b1;
        // Solved in equation ([A] T * [A]) * [T] = [A] T * [b].
        // and I think we may be assumed to be zero the a10 and a01?
        var a00 = this._a00;
        var a01 = this._a01_10;
        var a02 = this._a02_20;
        var a11 = this._a11;
        var a12 = this._a12_21;
        var a22 = this._a22;
        var t1 = a22 * b2 - a12 * b3;
        var t2 = a12 * b2 - a11 * b3;
        var t3 = a01 * b3 - a02 * b2;
        var t4 = a12 * a12 - a11 * a22;
        var t5 = a02 * a12 - a01 * a22;
        var t6 = a02 * a11 - a01 * a12;
        var det = a00 * t4 - a01 * t5 + a02 * t6;
        o_transfer.x = (a01 * t1 - a02 * t2 + b1 * t4) / det;
        o_transfer.y = -(a00 * t1 + a02 * t3 + b1 * t5) / det;
        o_transfer.z = (a00 * t2 + a01 * t3 + b1 * t6) / det;
        return;
    }
});

FLARTransMatResult = NyARTransMatResult;

NyARMath = Klass({
    sqNorm_NyARDoublePoint2d: function(i_p1, i_p2) { // p2-p1 Vector square I calculate the norm.
        var x, y;
        x = i_p2.x - i_p1.x;
        y = i_p2.y - i_p1.y;
        return x * x + y * y;
    },
    sqNorm_Number: function(i_p1x, i_p1y, i_p2x, i_p2y) {
        var x, y;
        x = i_p2x - i_p1x;
        y = i_p2y - i_p1y;
        return x * x + y * y;
    },
    sqNorm_NyARDoublePoint3d: function(i_p1, i_p2) { // p2-p1 Vector square I calculate the norm 
        var x, y, z;
        x = i_p2.x - i_p1.x;
        y = i_p2.y - i_p1.y;
        z = i_p2.z - i_p1.z;
        return x * x + y * y + z * z;
    },
    // http://aoki2.si.gunma-u.ac.jp/JavaScript/src/3jisiki.html
    cubeRoot: function(i_in) { // On systems that do not asks for the cube root, I will ask the third root.
        var res = Math.pow(Math.abs(i_in), 1.0 / 3.0);
        return (i_in >= 0) ? res : -res;
    }
});

NyAREquationSolver = Klass({
    solve2Equation_3: function(i_a, i_b, i_c, o_result) {
        NyAS3Utils.assert(i_a != 0);
        return this.solve2Equation_2b(i_b / i_a, i_c / i_a, o_result, 0);
    },
    solve2Equation_2a: function(i_b, i_c, o_result) {
        return this.solve2Equation_2b(i_b, i_c, o_result, 0);
    },
    solve2Equation_2b: function(i_b, i_c, o_result, i_result_st) {

        var t = i_b * i_b - 4 * i_c;

        if (t < 0) { // Imaginary roots                    
            return 0;

        } else if (t == 0) { // Multiple root
            o_result[i_result_st + 0] = -i_b / (2);
            return 1;

        } else { // Two real roots
            t = Math.sqrt(t);
            o_result[i_result_st + 0] = (-i_b + t) / (2);
            o_result[i_result_st + 1] = (-i_b - t) / (2);
            return 2;
        }
    },
    // find the real roots of the cubic equation a * x ^ 3 + b * x ^ 2 + c * x + d = 0.
    // is based on code: http://aoki2.si.gunma-u.ac.jp/JavaScript/src/3jisiki.html
    // @param i_a = Coefficient of X ^ 3
    // @param i_b = Coefficient of X ^ 2
    // @param i_c = Coefficient of X ^ 1
    // @param i_d = Coefficient of X ^ 0
    // @param o_result =  Real roots. By specifying a double [3].
    solve3Equation_4: function(i_a, i_b, i_c, i_d, o_result) {
        NyAS3Utils.assert(i_a != 0);
        return this.solve3Equation_3(i_b / i_a, i_c / i_a, i_d / i_a, o_result);
    },
    // find the real roots of the cubic equation x ^ 3 + b * x ^ 2 + c * x + d = 0. 
    // seek only.
    // as this.solve3Equation_4
    // @ Param o_result = Real roots. By specifying a double [1] or more.
    solve3Equation_3: function(i_b, i_c, i_d, o_result) {

        var tmp, b, p, q;
        b = i_b / (3);
        p = b * b - i_c / 3;
        q = (b * (i_c - 2 * b * b) - i_d) / 2;

        if ((tmp = q * q - p * p * p) == 0) { // Multiple root                    
            q = NyARMath.cubeRoot(q);
            o_result[0] = 2 * q - b;
            o_result[1] = -q - b;
            return 2;

        } else if (tmp > 0) { // Real roots 1, 2 Kyone                    
            var a3 = NyARMath.cubeRoot(q + ((q > 0) ? 1 : -1) * Math.sqrt(tmp));
            var b3 = p / a3;
            o_result[0] = a3 + b3 - b;
            // Kyone: -0.5 * (a3 + b3)-b, Math.abs (a3-b3) * Math.sqrt (3.0) / 2
            return 1;

        } else { // Three real roots                    
            tmp = 2 * Math.sqrt(p);
            var t = Math.acos(q / (p * tmp / 2));
            o_result[0] = tmp * Math.cos(t / 3) - b;
            o_result[1] = tmp * Math.cos((t + 2 * Math.PI) / 3) - b;
            o_result[2] = tmp * Math.cos((t + 4 * Math.PI) / 3) - b;
            return 3;
        }
    },
    // seek only the real roots of the fourth-order equation. 
    // @ Param i_a = Coefficient of X ^ 3
    // @ Param i_b = Coefficient of X ^ 2 
    // @ Param i_c = Coefficient of X ^ 1 
    // @ Param i_d = Coefficient of X ^ 0 
    // @ Param o_result = Real roots. By specifying a double [3].
    solve4Equation: function(i_a, i_b, i_c, i_d, i_e, o_result) {

        NyAS3Utils.assert(i_a != 0);
        var A3, A2, A1, A0, B3;
        A3 = i_b / i_a;
        A2 = i_c / i_a;
        A1 = i_d / i_a;
        A0 = i_e / i_a;
        B3 = A3 / 4;
        var p, q, r;
        var B3_2 = B3 * B3;
        p = A2 - 6 * B3_2;//A2-6*B3*B3;
        q = A1 + B3 * (-2 * A2 + 8 * B3_2);//A1-2*A2*B3+8*B3*B3*B3;
        r = A0 + B3 * (-A1 + A2 * B3) - 3 * B3_2 * B3_2;//A0-A1*B3+A2*B3*B3-3*B3*B3*B3*B3;

        if (q == 0) {
            var result_0, result_1;
            var res = this.solve2Equation_2b(p, r, o_result, 0); //Quadratic multiple

            switch (res) {

                case 0: // All imaginary solution                            
                    return 0;

                case 1: // Multiple root

                    result_0 = o_result[0]; // 0, 1 or 2.

                    if (result_0 < 0) { // All imaginary solution                                
                        return 0;

                    } else if (result_0 == 0) { // One real root
                        o_result[0] = 0 - B3;
                        return 1;

                    } else { //Two real roots                                
                        result_0 = Math.sqrt(result_0);
                        o_result[0] = result_0 - B3;
                        o_result[1] = -result_0 - B3;
                        return 2;
                    }

                case 2: //T2 == 0 t == is impossible because it is two real roots. (case1)
                    result_0 = o_result[0]; //0, 2, or 4
                    result_1 = o_result[1]; //0, 2, or 4
                    var number_of_result = 0;

                    if (result_0 > 0) { //NC
                        result_0 = Math.sqrt(result_0);
                        o_result[0] = result_0 - B3;
                        o_result[1] = -result_0 - B3;
                        number_of_result += 2;
                    }

                    if (result_1 > 0) { //NC
                        result_1 = Math.sqrt(result_1);
                        o_result[number_of_result + 0] = result_1 - B3;
                        o_result[number_of_result + 1] = -result_1 - B3;
                        number_of_result += 2;
                    }

                    return number_of_result;

                default:
                    throw new NyARException();
            }

        } else { //Other
            // Optimization point:                    
            var u = this.solve3Equation_1(// u^3  + (2*p)*u^2  +((- 4*r)+(p^2))*u -q^2= 0
                    (2 * p),
                    (-4 * r) + Math.pow(p, 2),
                    Math.pow(-q, 2)
                    );

            if (u < 0) { //All imaginary solution       
                return 0;
            }

            var ru = Math.sqrt(u);
            //By solving the quadratic equation calculation (optimization point) and y
            var result_1st, result_2nd;
            result_1st = this.solve2Equation_2b(-ru, (p + u) / 2 + ru * q / (2 * u), o_result, 0);

            switch (result_1st) { //For sequence repeated use, are saved to the variable

                case 0:
                    break;

                case 1:
                    o_result[0] = o_result[0] - B3;
                    break;

                case 2:
                    o_result[0] = o_result[0] - B3;
                    o_result[1] = o_result[1] - B3;
                    break;

                default:
                    throw new NyARException();
            }

            result_2nd = this.solve2Equation_2b(ru, (p + u) / 2 - ru * q / (2 * u), o_result, result_1st);

            switch (result_2nd) { //Stored in 0,1 th

                case 0:
                    break;

                case 1:
                    o_result[result_1st + 0] = o_result[result_1st + 0] - B3;
                    break;

                case 2:
                    o_result[result_1st + 0] = o_result[result_1st + 0] - B3;
                    o_result[result_1st + 1] = o_result[result_1st + 1] - B3;
                    break;

                default:
                    throw new NyARException();
            }
            return result_1st + result_2nd;
        }
    },
    solve3Equation_1: function(i_b, i_c, i_d) { // ask only one real root of the cubic equation, 4 characters in equation. 

        var tmp, b, p, q;
        b = i_b / (3);
        p = b * b - i_c / 3;
        q = (b * (i_c - 2 * b * b) - i_d) / 2;

        if ((tmp = q * q - p * p * p) == 0) { // Multiple root                    
            q = NyARMath.cubeRoot(q);
            return 2 * q - b;

        } else if (tmp > 0) { // Real roots 1, 2 Kyone                    
            var a3 = NyARMath.cubeRoot(q + ((q > 0) ? 1 : -1) * Math.sqrt(tmp));
            var b3 = p / a3;
            return a3 + b3 - b;

        } else { // Three real roots
            tmp = 2 * Math.sqrt(p);
            var t = Math.acos(q / (p * tmp / 2));
            return tmp * Math.cos(t / 3) - b;
        }
    }
});

NyARPerspectiveParamGenerator_O1 = Klass({
    _local_x: 0,
    _local_y: 0,
    _width: 0,
    _height: 0,
    initialize: function(i_local_x, i_local_y, i_width, i_height) {

        this._height = i_height;
        this._width = i_width;
        this._local_x = i_local_x;
        this._local_y = i_local_y;
        return;
    },
    getParam: function(i_vertex, o_param) {

        var ltx = this._local_x;
        var lty = this._local_y;
        var rbx = ltx + this._width;
        var rby = lty + this._height;
        var det_1;
        var a13, a14, a23, a24, a33, a34, a43, a44;
        var b11, b12, b13, b14, b21, b22, b23, b24, b31, b32, b33, b34, b41, b42, b43, b44;
        var t1, t2, t3, t4, t5, t6;
        var v1, v2, v3, v4;
        var kx0, kx1, kx2, kx3, kx4, kx5, kx6, kx7;
        var ky0, ky1, ky2, ky3, ky4, ky5, ky6, ky7;

        {
            v1 = i_vertex[0].x;
            v2 = i_vertex[1].x;
            v3 = i_vertex[2].x;
            v4 = i_vertex[3].x;
            a13 = -ltx * v1;
            a14 = -lty * v1;
            a23 = -rbx * v2;
            a24 = -lty * v2;
            a33 = -rbx * v3;
            a34 = -rby * v3;
            a43 = -ltx * v4;
            a44 = -rby * v4;
            t1 = a33 * a44 - a34 * a43;
            t4 = a34 * ltx - rbx * a44;
            t5 = rbx * a43 - a33 * ltx;
            t2 = rby * (a34 - a44);
            t3 = rby * (a43 - a33);
            t6 = rby * (rbx - ltx);
            b21 = -a23 * t4 - a24 * t5 - rbx * t1;
            b11 = (a23 * t2 + a24 * t3) + lty * t1;
            b31 = (a24 * t6 - rbx * t2) + lty * t4;
            b41 = (-rbx * t3 - a23 * t6) + lty * t5;
            t1 = a43 * a14 - a44 * a13;
            t2 = a44 * lty - rby * a14;
            t3 = rby * a13 - a43 * lty;
            t4 = ltx * (a44 - a14);
            t5 = ltx * (a13 - a43);
            t6 = ltx * (lty - rby);
            b12 = -rby * t1 - a33 * t2 - a34 * t3;
            b22 = (a33 * t4 + a34 * t5) + rbx * t1;
            b32 = (-a34 * t6 - rby * t4) + rbx * t2;
            b42 = (-rby * t5 + a33 * t6) + rbx * t3;
            t1 = a13 * a24 - a14 * a23;
            t4 = a14 * rbx - ltx * a24;
            t5 = ltx * a23 - a13 * rbx;
            t2 = lty * (a14 - a24);
            t3 = lty * (a23 - a13);
            t6 = lty * (ltx - rbx);
            b23 = -a43 * t4 - a44 * t5 - ltx * t1;
            b13 = (a43 * t2 + a44 * t3) + rby * t1;
            b33 = (a44 * t6 - ltx * t2) + rby * t4;
            b43 = (-ltx * t3 - a43 * t6) + rby * t5;
            t1 = a23 * a34 - a24 * a33;
            t2 = a24 * rby - lty * a34;
            t3 = lty * a33 - a23 * rby;
            t4 = rbx * (a24 - a34);
            t5 = rbx * (a33 - a23);
            t6 = rbx * (rby - lty);
            b14 = -lty * t1 - a13 * t2 - a14 * t3;
            b24 = a13 * t4 + a14 * t5 + ltx * t1;
            b34 = -a14 * t6 - lty * t4 + ltx * t2;
            b44 = -lty * t5 + a13 * t6 + ltx * t3;
            det_1 = (ltx * (b11 + b14) + rbx * (b12 + b13));

            if (det_1 == 0) {
                det_1 = 0.0001;
                console.log("Could not get inverse matrix(1). NyARUtils.js. return false?");
                //return false;
            }

            det_1 = 1 / det_1;
            kx0 = (b11 * v1 + b12 * v2 + b13 * v3 + b14 * v4) * det_1;
            kx1 = (b11 + b12 + b13 + b14) * det_1;
            kx2 = (b21 * v1 + b22 * v2 + b23 * v3 + b24 * v4) * det_1;
            kx3 = (b21 + b22 + b23 + b24) * det_1;
            kx4 = (b31 * v1 + b32 * v2 + b33 * v3 + b34 * v4) * det_1;
            kx5 = (b31 + b32 + b33 + b34) * det_1;
            kx6 = (b41 * v1 + b42 * v2 + b43 * v3 + b44 * v4) * det_1;
            kx7 = (b41 + b42 + b43 + b44) * det_1;
        }
        {
            v1 = i_vertex[0].y;
            v2 = i_vertex[1].y;
            v3 = i_vertex[2].y;
            v4 = i_vertex[3].y;
            a13 = -ltx * v1;
            a14 = -lty * v1;
            a23 = -rbx * v2;
            a24 = -lty * v2;
            a33 = -rbx * v3;
            a34 = -rby * v3;
            a43 = -ltx * v4;
            a44 = -rby * v4;
            t1 = a33 * a44 - a34 * a43;
            t4 = a34 * ltx - rbx * a44;
            t5 = rbx * a43 - a33 * ltx;
            t2 = rby * (a34 - a44);
            t3 = rby * (a43 - a33);
            t6 = rby * (rbx - ltx);
            b21 = -a23 * t4 - a24 * t5 - rbx * t1;
            b11 = (a23 * t2 + a24 * t3) + lty * t1;
            b31 = (a24 * t6 - rbx * t2) + lty * t4;
            b41 = (-rbx * t3 - a23 * t6) + lty * t5;
            t1 = a43 * a14 - a44 * a13;
            t2 = a44 * lty - rby * a14;
            t3 = rby * a13 - a43 * lty;
            t4 = ltx * (a44 - a14);
            t5 = ltx * (a13 - a43);
            t6 = ltx * (lty - rby);
            b12 = -rby * t1 - a33 * t2 - a34 * t3;
            b22 = (a33 * t4 + a34 * t5) + rbx * t1;
            b32 = (-a34 * t6 - rby * t4) + rbx * t2;
            b42 = (-rby * t5 + a33 * t6) + rbx * t3;
            t1 = a13 * a24 - a14 * a23;
            t4 = a14 * rbx - ltx * a24;
            t5 = ltx * a23 - a13 * rbx;
            t2 = lty * (a14 - a24);
            t3 = lty * (a23 - a13);
            t6 = lty * (ltx - rbx);
            b23 = -a43 * t4 - a44 * t5 - ltx * t1;
            b13 = (a43 * t2 + a44 * t3) + rby * t1;
            b33 = (a44 * t6 - ltx * t2) + rby * t4;
            b43 = (-ltx * t3 - a43 * t6) + rby * t5;
            t1 = a23 * a34 - a24 * a33;
            t2 = a24 * rby - lty * a34;
            t3 = lty * a33 - a23 * rby;
            t4 = rbx * (a24 - a34);
            t5 = rbx * (a33 - a23);
            t6 = rbx * (rby - lty);
            b14 = -lty * t1 - a13 * t2 - a14 * t3;
            b24 = a13 * t4 + a14 * t5 + ltx * t1;
            b34 = -a14 * t6 - lty * t4 + ltx * t2;
            b44 = -lty * t5 + a13 * t6 + ltx * t3;
            det_1 = (ltx * (b11 + b14) + rbx * (b12 + b13));
            if (det_1 == 0) {
                det_1 = 0.0001;
                console.log("Could not get inverse matrix(2). NyARUtils.js. return false?");
                //return false;
            }
            det_1 = 1 / det_1;
            ky0 = (b11 * v1 + b12 * v2 + b13 * v3 + b14 * v4) * det_1;
            ky1 = (b11 + b12 + b13 + b14) * det_1;
            ky2 = (b21 * v1 + b22 * v2 + b23 * v3 + b24 * v4) * det_1;
            ky3 = (b21 + b22 + b23 + b24) * det_1;
            ky4 = (b31 * v1 + b32 * v2 + b33 * v3 + b34 * v4) * det_1;
            ky5 = (b31 + b32 + b33 + b34) * det_1;
            ky6 = (b41 * v1 + b42 * v2 + b43 * v3 + b44 * v4) * det_1;
            ky7 = (b41 + b42 + b43 + b44) * det_1;
        }
        det_1 = kx5 * (-ky7) - (-ky5) * kx7;
        if (det_1 == 0) {
            det_1 = 0.0001;
            console.log("Could not get inverse matrix(3). NyARUtils. return false?");
            //return false;
        }
        det_1 = 1 / det_1;
        var C, F;
        o_param[2] = C = (-ky7 * det_1) * (kx4 - ky4) + (ky5 * det_1) * (kx6 - ky6); // C
        o_param[5] = F = (-kx7 * det_1) * (kx4 - ky4) + (kx5 * det_1) * (kx6 - ky6); // F
        o_param[6] = kx4 - C * kx5;
        o_param[7] = kx6 - C * kx7;
        o_param[0] = kx0 - C * kx1;
        o_param[1] = kx2 - C * kx3;
        o_param[3] = ky0 - F * ky1;
        o_param[4] = ky2 - F * ky3;
        return true;
    }
});

NyIdMarkerParam = ASKlass('NyIdMarkerParam', {
    direction: 0, // It is the orientation of the marker value.
    threshold: 0 // It is a threshold pattern of the marker around.
});

NyIdMarkerPattern = ASKlass('NyIdMarkerPattern', {
    model: 0,
    ctrl_domain: 0,
    ctrl_mask: 0,
    check: 0,
    data: new IntVector(32)
});

TThreshold = ASKlass('TThreshold', {
    th_h: 0,
    th_l: 0,
    th: 0,
    lt_x: 0,
    lt_y: 0,
    rb_x: 0,
    rb_y: 0
});

THighAndLow = ASKlass('THighAndLow', {
    h: 0,
    l: 0
});

// Marker pattern encoder
_bit_table_3 = new IntVector([
    25, 26, 27, 28, 29, 30, 31,
    48, 9, 10, 11, 12, 13, 32,
    47, 24, 1, 2, 3, 14, 33,
    46, 23, 8, 0, 4, 15, 34,
    45, 22, 7, 6, 5, 16, 35,
    44, 21, 20, 19, 18, 17, 36,
    43, 42, 41, 40, 39, 38, 37
]);

_bit_table_2 = new IntVector([
    9, 10, 11, 12, 13,
    24, 1, 2, 3, 14,
    23, 8, 0, 4, 15,
    22, 7, 6, 5, 16,
    21, 20, 19, 18, 17
]);

MarkerPattEncoder = ASKlass('MarkerPattEncoder', {//DEFAULT6
    _bit_table_2: _bit_table_2,
    _bit_table_3: _bit_table_3,
    _bit_tables: [
        _bit_table_2, _bit_table_3, null, null, null, null, null],
    /**
     * RECT(0):[0]=(0)
     * RECT(1):[1]=(1-8)
     * RECT(2):[2]=(9-16),[3]=(17-24)
     * RECT(3):[4]=(25-32),[5]=(33-40),[6]=(41-48)
     */
    _bit_table: null,
    _bits: new IntVector(16),
    _work: new IntVector(16),
    _model: 0
    ,
    setBitByBitIndex: function(i_index_no, i_value) {
//        console.log("i_index_no")
//        console.log(i_index_no)

        bidx = 1;

        console.log("i_value = " + i_value);
        console.log(" ");
//        console.log("this._bits[bidx] = " + this._bits[bidx])
        this._bits[bidx] = parseInt(this._bits[bidx].toString(2) + i_value, 2);
//        console.log("this._bits[bidx] = " + this._bits[bidx])

//        console.log("JSON.stringify(this._bits)")
//        console.log(JSON.stringify(this._bits))
        return;
    }
    ,
    setBit: function(i_bit_no, i_value) { //DEFAULT USELESS        
        NyAS3Utils.assert(i_value == 0 || i_value == 1);
        if (i_bit_no == 0) {
            this._bits[0] = i_value;
        } else {
            var bidx = toInt((i_bit_no - 1) / 8) + 1;
            var sidx = (i_bit_no - 1) % 8;
            this._bits[bidx] = (this._bits[bidx] & (~(0x01 << sidx))) | (i_value << sidx);
        }
        return;
    }
    ,
    getBit: function(i_bit_no) {
        if (i_bit_no == 0) {
            return this._bits[0];
        } else {
            var bidx = toInt((i_bit_no - 1) / 8) + 1;
            var sidx = (i_bit_no - 1) % 8;
            return (this._bits[bidx] >> (sidx)) & (0x01);
        }
    }
    ,
    getModel: function() {
        return this._model;
    }
    ,
    getControlValue: function(i_model, i_data) {
        var v;
        switch (i_model) {
            case 2:
                v = (i_data[2] & 0x0e) >> 1;
                return v >= 5 ? v - 1 : v; //cinco
            case 3:
                v = (i_data[4] & 0x3e) >> 1;
                return v >= 21 ? v - 1 : v;
            default:
                break;
        }
        return -1;
    }
    ,
    getCheckValue: function(i_model, i_data) {
        var v;
        switch (i_model) {
            case 2:
                v = (i_data[2] & 0xe0) >> 5; //cinco
                return v > 5 ? v - 1 : v; //cinco
            case 3:
                v = ((i_data[4] & 0x80) >> 7) | ((i_data[5] & 0x0f) << 1);
                return v > 21 ? v - 1 : v;
            default:
                break;
        }
        return -1;
    }
    ,
    initEncoder: function(i_model) {
        if (i_model > 3 || i_model < 2) {
            return false;
        }
        this._bit_table = this._bit_tables[i_model - 2];
        this._model = i_model;

        this._bits = new IntVector(16);

        return true;
    }
    ,
    getDirection: function() {
        var l, t, r, b;
        var timing_pat;
        switch (this._model) {
            case 2:
                // get tracking cel
                t = this._bits[2] & 0x1f;
                r = ((this._bits[2] & 0xf0) >> 4) | ((this._bits[3] & 0x01) << 4);
                b = this._bits[3] & 0x1f;
                l = ((this._bits[3] & 0xf0) >> 4) | ((this._bits[2] & 0x01) << 4);
                timing_pat = 0x0a;
                break;
            case 3:
                t = this._bits[4] & 0x7f;
                r = ((this._bits[4] & 0xc0) >> 6) | ((this._bits[5] & 0x1f) << 2);
                b = ((this._bits[5] & 0xf0) >> 4) | ((this._bits[6] & 0x07) << 4);
                l = ((this._bits[6] & 0xfc) >> 2) | ((this._bits[4] & 0x01) << 6);
                timing_pat = 0x2a;
                break;
            default:
                return -3;
        }
        // timing pattern comparison
        if (t == timing_pat) {
            if (r == timing_pat) {
                return (b != timing_pat && l != timing_pat) ? 2 : -2;
            } else if (l == timing_pat) {
                return (b != timing_pat && r != timing_pat) ? 3 : -2;
            }
        } else if (b == timing_pat) {
            if (r == timing_pat) {
                return (t != timing_pat && l != timing_pat) ? 1 : -2;
            } else if (l == timing_pat) {
                return (t != timing_pat && r != timing_pat) ? 0 : -2;
            }
        }
        return -1;
    }
    ,
    // Encodes the stored marker pattern, writes marker data to o_out.
    // On success, returns the marker direction. On failure, returns -1.
    encode: function(o_out) {



        var d = this.getDirection();
        if (d < 0) {
            return -1;
        }
//        console.log(JSON.stringify(o_out.data))
        // Acquire the rotation bit
        this.getRotatedBits(d, o_out.data);

//        console.log(JSON.stringify(o_out.data))

        var model = this._model;
        // Acquire border bits
        o_out.model = model;
        var control_bits = this.getControlValue(model, o_out.data);

        o_out.check = this.getCheckValue(model, o_out.data);
        o_out.ctrl_mask = control_bits % 5; //cinco
        o_out.ctrl_domain = toInt(control_bits / 5); //cinco
        if (o_out.ctrl_domain != 0 || o_out.ctrl_mask != 0) { // if failed to find a proper mask and domain
            return -1;
        }

        return d; // implement mask release
    }
    ,
    getRotatedBits: function(i_direction, o_out) {

        console.log("o_out")
        console.log(JSON.stringify(o_out))

        var sl = i_direction * 2;
        var sr = 8 - sl;
        var w1;
        o_out[0] = this._bits[0];
        //RECT1

        w1 = this._bits[1];
        console.log("w1")
        console.log(w1)
        o_out[1] = ((w1 << sl) | (w1 >> sr)) & 0xff;

        //RECT2
        sl = i_direction * 4;
        sr = 16 - sl;
        w1 = this._bits[2] | (this._bits[3] << 8);
        w1 = (w1 << sl) | (w1 >> sr);
        o_out[2] = w1 & 0xff;
        o_out[3] = (w1 >> 8) & 0xff;
        if (this._model < 2) {
            return;
        }
        //RECT3
        sl = i_direction * 6;
        sr = 24 - sl;
        w1 = this._bits[4] | (this._bits[5] << 8) | (this._bits[6] << 16);
        w1 = (w1 << sl) | (w1 >> sr);
        o_out[4] = w1 & 0xff;
        o_out[5] = (w1 >> 8) & 0xff;
        o_out[6] = (w1 >> 16) & 0xff;
        if (this._model < 3) {
            return;
        }
        return;
    }
    , shiftLeft: function(i_pack, i_start, i_length, i_ls)
    {
        var i;
        var work = this._work;
        // Fractional shift
        var mod_shift = i_ls % 8;
        for (i = i_length - 1; i >= 1; i--) {
            work[i] = (i_pack[i + i_start] << mod_shift) | (0xff & (i_pack[i + i_start - 1] >> (8 - mod_shift)));
        }
        work[0] = (i_pack[i_start] << mod_shift) | (0xff & (i_pack[i_start + i_length - 1] >> (8 - mod_shift)));
        //Byte shift
        var byte_shift = toInt(i_ls / 8) % i_length;
        for (i = i_length - 1; i >= 0; i--) {
            i_pack[(byte_shift + i) % i_length + i_start] = 0xff & work[i];
        }
        return;
    }
});

INyIdMarkerData = ASKlass('INyIdMarkerData', {
    // @Param i_target = Marker object to compare 
    isEqual: function(i_target) { // return data and its own marker data of i_target is equal
    },
    copyFrom: function(i_source) { // copy the marker data from i_source.
    }
});

NyIdMarkerPickup = ASKlass('NyIdMarkerPickup', {// NyARIdMarkerData from any rectangle of the raster image //DEFAULT5
    _perspective_reader: null,
    __pickFromRaster_th: new TThreshold(),
    __pickFromRaster_encoder: new MarkerPattEncoder(),
    NyIdMarkerPickup: function() {
        this._perspective_reader = new PerspectivePixelReader();
        return;
    }
    ,
    init: function() { // Initialize the marker for a new frame. Clears old cache values
        this._perspective_reader.newFrame();
    }
    ,
    // read id marker from i_image. Marker data to o_data, marker parameters to o_param.
    pickFromRaster: function(image, i_vertex, o_data, o_param) {
        // Calculate the parameters of perspective
        if (!this._perspective_reader.setSourceSquare(i_vertex)) {
            if (window.DEBUG)
                console.log('NyIdMarkerPickup.pickFromRaster: could not setSourceSquare')
            return false;
        }
        var reader = image.getGrayPixelReader();

        var raster_size = image.getSize();
        var th = this.__pickFromRaster_th;
        var encoder = this.__pickFromRaster_encoder;
        // Get the marker parameter
        this._perspective_reader.detectThresholdValue(reader, raster_size, th);
        if (!this._perspective_reader.readDataBits(reader, raster_size, th, encoder)) {
            if (window.DEBUG)
                console.log('NyIdMarkerPickup.pickFromRaster: could not readDataBits')
            console.log("RETURN FALSE")
            return false;
        }

        o_data = new NyIdMarkerPattern();

        var d = encoder.encode(o_data);
        if (d < 0) {
            if (window.DEBUG)
                console.log("DONE")
            console.log('NyIdMarkerPickup.pickFromRaster: could not encode')
            return false;
        }
        o_param.direction = d;
        o_param.threshold = th.th;
        return true;
    }
});

//// reading NyARColorPatt_NyIdMarker. Conversion from raster Perspective
//PerspectivePixelReader = ASKlass('PerspectivePixelReader', {//DEFAULT7
//    _param_gen: new NyARPerspectiveParamGenerator_O1(1, 1, 100, 100),
//    _cparam: new FloatVector(8),
//    PerspectivePixelReader: function() {
//        return;
//    },
//    maxPreviousFrameAge: 1
//    ,
//    newFrame: function() {
//        for (var i in this.previousFrames) {
//            var pf = this.previousFrames[i];
//            pf.age++;
//            if (pf.age > this.maxPreviousFrameAge) {
//                delete this.previousFrames[i];
//            }
//        }
//    }
//    ,
//    setSourceSquare: function(i_vertex) {
//        var cx = 0, cy = 0;
//        for (var i = 0; i < 4; i++) {
//            cx += i_vertex[i].x;
//            cy += i_vertex[i].y;
//        }
//        cx /= 4;
//        cy /= 4;
//        var qx = toInt(cx / 10);
//        var qy = toInt(cy / 10);
//        this.centerPoint[0] = qx;
//        this.centerPoint[1] = qy;
//        return this._param_gen.getParam(i_vertex, this._cparam);
//    }
//    ,
//    // cut out from a rectangular pixel
//    // @param o_pixel = first index of the storage location
//    rectPixels: function(i_reader, i_raster_size, i_lt_x, i_lt_y, i_step_x, i_step_y, i_width, i_height, i_out_st, o_pixel) {
//        var cpara = this._cparam;
//        var ref_x = this._ref_x;
//        var ref_y = this._ref_y;
//        var pixcel_temp = this._pixcel_temp;
//        var raster_width = i_raster_size.w;
//        var raster_height = i_raster_size.h;
//        var out_index = i_out_st;
//        var cpara_6 = cpara[6];
//        var cpara_0 = cpara[0];
//        var cpara_3 = cpara[3];
//        for (var i = 0; i < i_height; i++) {
//            // calculate the index values ​​of the pixels of one column.
//            var cy0 = 1 + i * i_step_y + i_lt_y;
//            var cpy0_12 = cpara[1] * cy0 + cpara[2];
//            var cpy0_45 = cpara[4] * cy0 + cpara[5];
//            var cpy0_7 = cpara[7] * cy0 + 1.0;
//            var pt = 0;
//            var i2;
//            for (i2 = 0; i2 < i_width; i2++) {
//                var cx0 = 1 + i2 * i_step_x + i_lt_x;
//                var d = cpara_6 * cx0 + cpy0_7;
//                var x = toInt((cpara_0 * cx0 + cpy0_12) / d);
//                var y = toInt((cpara_3 * cx0 + cpy0_45) / d);
//                if (x < 0 || y < 0 || x >= raster_width || y >= raster_height) {
//                    return false;
//                }
//                ref_x[pt] = x;
//                ref_y[pt] = y;
//                pt++;
//            }
//            // (The person who wrote the only accessor is good in some cases) to get the pixel of one line
//            i_reader.getPixelSet(ref_x, ref_y, i_width, pixcel_temp);
//            // While the gray scale, transfer to the line → map
//            for (i2 = 0; i2 < i_width; i2++) {
//                var index = i2;
//                o_pixel[out_index] = pixcel_temp[index];
//                out_index++;
//            }
//        }
//        return true;
//    }
//    ,
//    // the period of the zero-crossing point in the i_freq, Check for regular intervals
//    // The next stage and a half period is greater than 80% of the previous stage, 
//    // it is considered to be equally spaced period, those which are less than 120%
//    checkFreqWidth: function(i_freq, i_width) {
//        var c = i_freq[1] - i_freq[0];
//        var count = i_width * 2 - 1;
//        for (var i = 1; i < count; i++) {
//            var n = i_freq[i + 1] - i_freq[i];
//            var v = n * 100 / c;
//            if (v > 150 || v < 50) {
//                return false;
//            }
//            c = n;
//        }
//        return true;
//    }
//    ,
//    // Investigate the contents of i_freq_table and i_freq_count_table, and returns the largest frequency component
//    // return Greater than or equal to zero, less than zero if Tsurakere dense if found 
//    getMaxFreq: function(i_freq_count_table, i_freq_table, o_freq_table) {
//        // get a larger component of most
//        var index = -1;
//        var max = 0;
//        var i;
//        for (i = 0; i < this.MAX_FREQ; i++) {
//            if (max < i_freq_count_table[i]) {
//                index = i;
//                max = i_freq_count_table[i];
//            }
//        }
//        if (index == -1) {
//            return -1;
//        }
//        // Calculate the frequency index
//        var st = (index - 1) * index;
//        for (i = 0; i < index * 2; i++)
//        {
//            o_freq_table[i] = i_freq_table[st + i] * this.FRQ_STEP / max;
//        }
//        return index;
//    },
//    // (It this.FRQ_POINTS * this.FRQ_STEP does not exceed 100) parameters of timing pattern //line length
//    FRQ_EDGE: 10,
//    FRQ_STEP: 2,
//    FRQ_POINTS: (100 - (10 * 2)) / 2, /*FRQ_EDGE & FRQ_STEP*/
//    MIN_FREQ: 1,
//    MAX_FREQ: 3,
//    FREQ_SAMPLE_NUM: 4,
//    MAX_DATA_BITS: 3 + 3 /*MAX_FREQ + MAX_FREQ*/ - 1,
//    _ref_x: new IntVector(108),
//    _ref_y: new IntVector(108),
//    // whichever is greater this.THRESHOLD_PIXEL * 3 and (model +1) * 4 * 3
//    _pixcel_temp: new IntVector(108),
//    _freq_count_table: new IntVector(3/*MAX_FREQ*/),
//    _freq_table: new IntVector((3/*MAX_FREQ*/ * 2 - 1) * 3/*MAX_FREQ*/ * 2 / 2)
//    ,
//    //
////    FRQ_EDGE: 10,
////    FRQ_STEP: 2,
////    FRQ_POINTS: (100 - (5/*FRQ_EDGE*/ * 2)) / 2, //FRQ_STEP
////    MIN_FREQ: 3,
////    MAX_FREQ: 10,
////    FREQ_SAMPLE_NUM: 4,
////    MAX_DATA_BITS: 10 + 10/*MAX_FREQ + MAX_FREQ*/ - 1,
////    _freq_count_table: new IntVector(10/*MAX_FREQ*/),
////    _freq_table: new IntVector((10/*MAX_FREQ*/ * 2 - 1) * 10/*MAX_FREQ*/ * 2 / 2)
//    //
//    THRESHOLD_EDGE: 10, //TroLL
//    THRESHOLD_STEP: 2,
//    THRESHOLD_WIDTH: 20,
//    THRESHOLD_PIXEL: 20 / 2, // this.THRESHOLD_WIDTH/this.THRESHOLD_STEP
//    THRESHOLD_SAMPLE: 10 * 10, // this.THRESHOLD_PIXEL*this.THRESHOLD_PIXEL //cinco
//    THRESHOLD_SAMPLE_LT: 10, // this.THRESHOLD_EDGE,
//    THRESHOLD_SAMPLE_RB: 100 - 10 - 10 // this.THRESHOLD_WIDTH-this.THRESHOLD_EDGE //TroLL 1.5    
//    ,
////    THRESHOLD_EDGE: 20, //line move
////    THRESHOLD_STEP: 2,
////    THRESHOLD_WIDTH: 20,
////    THRESHOLD_PIXEL: 20 / 2/*this.THRESHOLD_WIDTH/this.THRESHOLD_STEP*/,
////    THRESHOLD_SAMPLE: 10 * 10/*this.THRESHOLD_PIXEL*this.THRESHOLD_PIXEL*/,
////    THRESHOLD_SAMPLE_LT: 20/*this.THRESHOLD_EDGE*/,
////    THRESHOLD_SAMPLE_RB: 100 - 20 - 20/*this.THRESHOLD_WIDTH-this.THRESHOLD_EDGE*/
//
//    __detectThresholdValue_hl: new THighAndLow(),
//    __detectThresholdValue_tpt: new NyARIntPoint2d(),
//    _th_pixels: new IntVector(100/*this.THRESHOLD_SAMPLE*/ * 4)
//    ,
//    //
//    __detectDataBitsIndex_freq_index1: new IntVector(40/*this.FRQ_POINTS*/)
//    ,
//    __detectDataBitsIndex_freq_index2: new IntVector(40/*this.FRQ_POINTS*/)
//    ,
//    //
//    __readDataBits_index_bit_x: new FloatVector(5/*MAX_DATA_BITS*/ * 2)
//    ,
//    __readDataBits_index_bit_y: new FloatVector(5/*MAX_DATA_BITS*/ * 2)
//    ,
//    // By averaging the i_y2 line and i_y1 line, you get the frequency of the timing pattern. 
//    // As one cycle LHL, for example, return 2 for LHLHL. The pattern level of the beginning and end of HLHL such as LHLH different 
//    // @param o_edge_index = array that receives the index (H-> L, L-> H) edge of the detected position
//    getRowFrequency: function(i_reader, i_raster_size, i_y1, i_th_h, i_th_l, o_edge_index) {
//        var i;
//        var freq_count_table = this._freq_count_table; // 3,4,5,6,7,8,9,10        
//        var freq_table = this._freq_table; // Array with elements of 0,2,4,6,8,10,12,14,16,18,20
//        //Initialization
//        var cpara = this._cparam;
//        var ref_x = this._ref_x;
//        var ref_y = this._ref_y;
//        var pixcel_temp = this._pixcel_temp;
//        for (i = 0; i < 10; i++) {
//            freq_count_table[i] = 0;
//        }
//        for (i = 0; i < 110; i++) {
//            freq_table[i] = 0;
//        }
//        var raster_width = i_raster_size.w;
//        var raster_height = i_raster_size.h;
//        var cpara_0 = cpara[0];
//        var cpara_3 = cpara[3];
//        var cpara_6 = cpara[6];
//        var cv;
//        if (window.DEBUG) {
//            cv = document.getElementById('debugCanvas').getContext('2d');
//            cv.fillStyle = 'orange';
//        }
//        // To detect the timing pattern from 10-20 th pixel
//        console.log("_________________________");
//        for (i = 0; i < this.FREQ_SAMPLE_NUM; i++) {
//            var i2;
//            // Calculate the pixel index of two lines
//            var cy0 = 1 + i_y1 + i; // this.FRQ_STEP * 5 + this.FRQ_EDGE
//            var cpy0_12 = cpara[1] * cy0 + cpara[2];
//            var cpy0_45 = cpara[4] * cy0 + cpara[5];
//            var cpy0_7 = cpara[7] * cy0 + 1.0;
//            var pt = 0;
//            for (i2 = 0; i2 < this.FRQ_POINTS; i2++) {
//                var cx0 = 1 + i2 * this.FRQ_STEP + this.FRQ_EDGE;
//                var d = (cpara_6 * cx0) + cpy0_7;
//                var x = toInt((cpara_0 * cx0 + cpy0_12) / d);
//                var y = toInt((cpara_3 * cx0 + cpy0_45) / d);
//                if (x < 0 || y < 0 || x >= raster_width || y >= raster_height) {
//                    return -1;
//                }
//                ref_x[pt] = x;
//                ref_y[pt] = y;
//                pt++;
//            }
//            // (By adjusting the tip from here If diversify input image) enrolled in pixels
//            i_reader.getPixelSet(ref_x, ref_y, this.FRQ_POINTS, pixcel_temp);
//            if (window.DEBUG) {
//                for (var j = 0; j < this.FRQ_POINTS; j++) {
//                    cv.fillRect(ref_x[j], ref_y[j], 1, 1);
//                }
//            }
//            // to investigate to destroy temporarily o_edge_index
//            var freq_t = this.getFreqInfo(pixcel_temp, i_th_h, i_th_l, o_edge_index);
//
//
//            if (freq_t < this.MIN_FREQ || freq_t > this.MAX_FREQ) { // Period should be a 3-10
//                console.log("freq_t = " + freq_t)
//                continue;
//            }
//
//            if (!this.checkFreqWidth(o_edge_index, freq_t)) { // Period to be equally spaced
//                continue;
//            }
//
//            freq_count_table[freq_t]++; // Added detection counter
//            var table_st = (freq_t - 1) * freq_t;
//            for (i2 = 0; i2 < freq_t * 2; i2++) {
//                freq_table[table_st + i2] += o_edge_index[i2];
//            }
//        }
//        return this.getMaxFreq(freq_count_table, freq_table, o_edge_index);
//    }
//    ,
//    getColFrequency: function(i_reader, i_raster_size, i_x1, i_th_h, i_th_l, o_edge_index) {
//        var i;
//        var cpara = this._cparam;
//        var ref_x = this._ref_x;
//        var ref_y = this._ref_y;
//        var pixcel_temp = this._pixcel_temp;
//        //0,2,4,6,8,10,12,14,16,18,20=(11*20)/2=110
//        //Initialization
//        var freq_count_table = this._freq_count_table;
//        for (i = 0; i < 10; i++) {
//            freq_count_table[i] = 0;
//        }
//        var freq_table = this._freq_table;
//        for (i = 0; i < 110; i++) {
//            freq_table[i] = 0;
//        }
//        var raster_width = i_raster_size.w;
//        var raster_height = i_raster_size.h;
//        var cpara7 = cpara[7];
//        var cpara4 = cpara[4];
//        var cpara1 = cpara[1];
//        var cv;
//        if (window.DEBUG) {
//            cv = document.getElementById('debugCanvas').getContext('2d');
//            cv.fillStyle = 'green';
//        }
//        // The extracted as a reference pattern 4 pixels from the reference point
//        for (i = 0; i < this.FREQ_SAMPLE_NUM; i++) {
//            var i2;
//            var cx0 = 1 + i/**this.FRQ_STEP*5+this.FRQ_EDGE*/ + i_x1;
//            var cp6_0 = cpara[6] * cx0;
//            var cpx0_0 = cpara[0] * cx0 + cpara[2];
//            var cpx3_0 = cpara[3] * cx0 + cpara[5];
//            var pt = 0;
//            for (i2 = 0; i2 < this.FRQ_POINTS; i2++)
//            {
//                var cy = 1 + i2 * this.FRQ_STEP + this.FRQ_EDGE;
//                var d = cp6_0 + cpara7 * cy + 1.0;
//                var x = toInt((cpx0_0 + cpara1 * cy) / d);
//                var y = toInt((cpx3_0 + cpara4 * cy) / d);
//                if (x < 0 || y < 0 || x >= raster_width || y >= raster_height)
//                {
//                    return -1;
//                }
//                ref_x[pt] = x;
//                ref_y[pt] = y;
//                pt++;
//            }
//            // (Can be adjusted here if you diversify the input image) enrolled in pixels
//            i_reader.getPixelSet(ref_x, ref_y, this.FRQ_POINTS, pixcel_temp);
//            if (window.DEBUG) {
//                for (var j = 0; j < this.FRQ_POINTS; j++) {
//                    cv.fillRect(ref_x[j], ref_y[j], 1, 1);
//                }
//            }
//            var freq_t = this.getFreqInfo(pixcel_temp, i_th_h, i_th_l, o_edge_index);
//            // Period should be a 3-10
//            if (freq_t < this.MIN_FREQ || freq_t > this.MAX_FREQ) {
//                continue;
//            }
//            // Period to be equally spaced
//            if (!this.checkFreqWidth(o_edge_index, freq_t)) {
//                continue;
//            }
//            // Added detection counter
//            freq_count_table[freq_t]++;
//            var table_st = (freq_t - 1) * freq_t;
//            for (i2 = 0; i2 < freq_t * 2; i2++) {
//                freq_table[table_st + i2] += o_edge_index[i2];
//            }
//        }
//        return 2;
//        return this.getMaxFreq(freq_count_table, freq_table, o_edge_index);
//    }
//    ,
//    // Contact k in the static you have finished debugging
//    getFreqInfo: function(i_pixcels, i_th_h, i_th_l, o_edge_index) {
//        // By analyzing the token, to calculate the frequency
//        var i = 0;
//        var frq_l2h = 0;
//        var frq_h2l = 0;
//        var index, pix;
//        while (i < this.FRQ_POINTS) {
//            // detect the L-> H token
//            while (i < this.FRQ_POINTS) {
//                index = i;
//                pix = i_pixcels[index];
//                if (pix > i_th_h) {
//                    // Token discovery
//                    o_edge_index[frq_l2h + frq_h2l] = i;
//                    frq_l2h++;
//                    break;
//                }
//                i++;
//            }
//            i++;
//            // detect the L-> H token
//            while (i < this.FRQ_POINTS) {
//                index = i;
//                pix = i_pixcels[index];
//                if (pix <= i_th_l) {
//                    // Token discovery
//                    o_edge_index[frq_l2h + frq_h2l] = i;
//                    frq_h2l++;
//                    break;
//                }
//                i++;
//            }
//            i++;
//        }
//        return frq_l2h == frq_h2l ? frq_l2h : -1;
//    },
//    // ask the average pixel value of the upper pixel array, of 4 pixels lower
//    // determine the threshold of two-way Ptail method that occupies the area of (4/i_pixcel.length)
//    getPtailHighAndLow: function(i_pixcel, i_out) {
//        var h3, h2, h1, h0, l3, l2, l1, l0;
//        h3 = h2 = h1 = h0 = l3 = l2 = l1 = l0 = i_pixcel[0];
//        for (var i = i_pixcel.length - 1; i >= 1; i--) {
//            var pix = i_pixcel[i];
//            if (h0 < pix) {
//                if (h1 < pix) {
//                    if (h2 < pix) {
//                        if (h3 < pix) {
//                            h0 = h1;
//                            h1 = h2;
//                            h2 = h3;
//                            h3 = pix;
//                        } else {
//                            h0 = h1;
//                            h1 = h2;
//                            h2 = pix;
//                        }
//                    } else {
//                        h0 = h1;
//                        h1 = pix;
//                    }
//                } else {
//                    h0 = pix;
//                }
//            }
//            if (l0 > pix) {
//                if (l1 > pix) {
//                    if (l2 > pix) {
//                        if (l3 > pix) {
//                            l0 = l1;
//                            l1 = l2;
//                            l2 = l3;
//                            l3 = pix;
//                        } else {
//                            l0 = l1;
//                            l1 = l2;
//                            l2 = pix;
//                        }
//                    } else {
//                        l0 = l1;
//                        l1 = pix;
//                    }
//                } else {
//                    l0 = pix;
//                }
//            }
//        }
//        i_out.l = (l0 + l1 + l2 + l3) / 4;
//        i_out.h = (h0 + h1 + h2 + h3) / 4;
//        return;
//    },
//    // Investigate the pixel value of the specified location, and returns by calculating the threshold.
//    detectThresholdValue: function(i_reader, i_raster_size, o_threshold) { //DEFAULT77
//        var th_pixels = this._th_pixels;
//        // obtain a pixel from the pick-up area in the upper left (00-24)
//        this.rectPixels(i_reader, i_raster_size, this.THRESHOLD_SAMPLE_LT, this.THRESHOLD_SAMPLE_LT, this.THRESHOLD_STEP, this.THRESHOLD_STEP, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, 0, th_pixels);
//        // obtain a pixel from the pick-up area at the bottom left (25-49)
//        this.rectPixels(i_reader, i_raster_size, this.THRESHOLD_SAMPLE_LT, this.THRESHOLD_SAMPLE_RB, this.THRESHOLD_STEP, this.THRESHOLD_STEP, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, this.THRESHOLD_SAMPLE, th_pixels);
//        // obtain a pixel from the pick-up area in the upper right corner (50-74)
//        this.rectPixels(i_reader, i_raster_size, this.THRESHOLD_SAMPLE_RB, this.THRESHOLD_SAMPLE_LT, this.THRESHOLD_STEP, this.THRESHOLD_STEP, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, this.THRESHOLD_SAMPLE * 2, th_pixels);
//        // obtain a pixel from the pick-up area in the lower right (75-99)
//        this.rectPixels(i_reader, i_raster_size, this.THRESHOLD_SAMPLE_RB, this.THRESHOLD_SAMPLE_RB, this.THRESHOLD_STEP, this.THRESHOLD_STEP, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, this.THRESHOLD_SAMPLE * 3, th_pixels);
//        var hl = this.__detectThresholdValue_hl;
//
//        this.getPtailHighAndLow(th_pixels, hl); // Pixel average obtained in Ptail
//
//        var th = (hl.h + hl.l) / 2; // Threshold center
//
//        var th_sub = (hl.h - hl.l) / 5; // Hysteresis (20% of the difference)
//        o_threshold.th = th;
//        o_threshold.th_h = th + th_sub; // With hysteresis threshold
//        o_threshold.th_l = th - th_sub; // With hysteresis threshold
//        // Calculation (bright point center of gravity) the edge
//        var lt_x, lt_y, lb_x, lb_y, rt_x, rt_y, rb_x, rb_y;
//        var tpt = this.__detectThresholdValue_tpt;
//        //LT
//        if (this.getHighPixelCenter(0, th_pixels, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, th, tpt)) {
//            lt_x = tpt.x * this.THRESHOLD_STEP;
//            lt_y = tpt.y * this.THRESHOLD_STEP;
//        } else {
//            lt_x = 11;
//            lt_y = 11;
//        }
//        //LB
//        if (this.getHighPixelCenter(this.THRESHOLD_SAMPLE * 1, th_pixels, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, th, tpt)) {
//            lb_x = tpt.x * this.THRESHOLD_STEP;
//            lb_y = tpt.y * this.THRESHOLD_STEP;
//        } else {
//            lb_x = 11;
//            lb_y = -1;
//        }
//        //RT
//        if (this.getHighPixelCenter(this.THRESHOLD_SAMPLE * 2, th_pixels, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, th, tpt)) {
//            rt_x = tpt.x * this.THRESHOLD_STEP;
//            rt_y = tpt.y * this.THRESHOLD_STEP;
//        } else {
//            rt_x = -1;
//            rt_y = 11;
//        }
//        //RB
//        if (this.getHighPixelCenter(this.THRESHOLD_SAMPLE * 3, th_pixels, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, th, tpt)) {
//            rb_x = tpt.x * this.THRESHOLD_STEP;
//            rb_y = tpt.y * this.THRESHOLD_STEP;
//        } else {
//            rb_x = -1;
//            rb_y = -1;
//        }
//        // Determination of the tracking start position
//        o_threshold.lt_x = (lt_x + lb_x) / 2 + this.THRESHOLD_SAMPLE_LT - 1;
//        o_threshold.rb_x = (rt_x + rb_x) / 2 + this.THRESHOLD_SAMPLE_RB + 1;
//        o_threshold.lt_y = (lt_y + rt_y) / 2 + this.THRESHOLD_SAMPLE_LT - 1;
//        o_threshold.rb_y = (lb_y + rb_y) / 2 + this.THRESHOLD_SAMPLE_RB + 1;
//
//        return;
//    }
//    ,
//    getHighPixelCenter: function(i_st, i_pixels, i_width, i_height, i_th, o_point) {
//        var rp = i_st;
//        var pos_x = 0;
//        var pos_y = 0;
//        var number_of_pos = 0;
//        for (var i = 0; i < i_height; i++) {
//            for (var i2 = 0; i2 < i_width; i2++) {
//                if (i_pixels[rp++] > i_th) {
//                    pos_x += i2;
//                    pos_y += i;
//                    number_of_pos++;
//                }
//            }
//        }
//        if (number_of_pos > 0) {
//            pos_x /= number_of_pos;
//            pos_y /= number_of_pos;
//        } else {
//            return false;
//        }
//        o_point.x = pos_x;
//        o_point.y = pos_y;
//        return true;
//    }
//    ,
//    detectDataBitsIndex: function(i_reader, i_raster_size, i_th, o_index_row, o_index_col) {
//        var i;
//        // Measure the frequency
//        var freq_index1 = this.__detectDataBitsIndex_freq_index1;
//        var freq_index2 = this.__detectDataBitsIndex_freq_index2;
//
//        var frq_t = this.getRowFrequency(i_reader, i_raster_size, i_th.lt_y, i_th.th_h, i_th.th_l, freq_index1);
//        var frq_b = this.getRowFrequency(i_reader, i_raster_size, i_th.rb_y, i_th.th_h, i_th.th_l, freq_index2);
//
//        // Create an index from the timing pattern
//        var freq_h, freq_v;
//        var index;
//        if (frq_t > frq_b) {
//            freq_h = frq_t;
//            index = freq_index1;
//        } else {
//            freq_h = frq_b;
//            index = freq_index2;
//        }
//        for (i = 0; i < freq_h + freq_h - 1; i++) {
//            o_index_row[i * 2] = ((index[i + 1] - index[i]) * 2 / 5 + index[i]) + this.FRQ_EDGE;
//            o_index_row[i * 2 + 1] = ((index[i + 1] - index[i]) * 3 / 5 + index[i]) + this.FRQ_EDGE;
//        }
//
//        var frq_l = this.getColFrequency(i_reader, i_raster_size, i_th.lt_x, i_th.th_h, i_th.th_l, freq_index1);
//        var frq_r = this.getColFrequency(i_reader, i_raster_size, i_th.rb_x, i_th.th_h, i_th.th_l, freq_index2);
//
//        if (frq_t < 0 && frq_b < 0 && frq_l < 0 && frq_r < 0) {
//            if (window.DEBUG)
//                console.log('bad row or col frq', frq_l, frq_r);
//            return -1;
//        }
//
//        // Create an index from the timing pattern
//        if (frq_l > frq_r) {
//            freq_v = frq_l;
//            index = freq_index1;
//        } else {
//            freq_v = frq_r;
//            index = freq_index2;
//        }
//
//        for (i = 0; i < freq_v + freq_v - 1; i++) {
//            var w = index[i];
//            var w2 = index[i + 1] - w;
//            o_index_col[i * 2] = ((w2) * 2 / 5 + w) + this.FRQ_EDGE;
//            o_index_col[i * 2 + 1] = ((w2) * 3 / 5 + w) + this.FRQ_EDGE;
//        }
//
//        // The impossible Lv4 or more
//        if (freq_v > this.MAX_FREQ) {
//            if (window.DEBUG)
//                console.log('too high freq', freq_v)
//            return -1;
//        }
//
//        return freq_v;
//    }
//    ,
//    previousFrames: {}
//    ,
//    centerPoint: new IntVector(2)
//    ,
//    getPreviousFrameSize: function(index_x, index_y) {
//        var cx = this.centerPoint[0], cy = this.centerPoint[1];
//        var pfs = this.previousFrames;
//        var pf = (
//                pfs[cx + ":" + cy] || pfs[(cx - 1) + ":" + cy] || pfs[(cx + 1) + ":" + cy] ||
//                pfs[cx + ":" + (cy - 1)] || pfs[(cx - 1) + ":" + (cy - 1)] || pfs[(cx + 1) + ":" + (cy - 1)] ||
//                pfs[cx + ":" + (cy + 1)] || pfs[(cx - 1) + ":" + (cy + 1)] || pfs[(cx + 1) + ":" + (cy + 1)]
//                );
//        if (!pf)
//            return -1;
//        index_x.set(pf.index_x);
//        index_y.set(pf.index_y);
//        return pf.size;
//    }
//    ,
//    setPreviousFrameSize: function(size, index_x, index_y) {
//        var pf = this.previousFrames[this.centerPoint[0] + ":" + this.centerPoint[1]];
//        if (!pf) {
//            pf = {age: 0, size: size, index_x: new FloatVector(index_x), index_y: new FloatVector(index_y)};
//            this.previousFrames[this.centerPoint[0] + ":" + this.centerPoint[1]] = pf;
//            return;
//        }
//        pf.age = 0;
//        pf.size = size;
//        pf.index_x.set(index_x);
//        pf.index_y.set(index_y);
//    }
//    ,
//    readDataBits: function(i_reader, i_raster_size, i_th, o_bitbuffer) {
//        var index_x = this.__readDataBits_index_bit_x;
//        var index_y = this.__readDataBits_index_bit_y;
//
//        // Get the reading position
//        var size = this.detectDataBitsIndex(i_reader, i_raster_size, i_th, index_x, index_y);
//        console.log("size = " + size)
//
//        if (size < 0) {
//            console.log("size = " + size + " < 0")
//            size = this.getPreviousFrameSize(index_x, index_y);
//        }
//
//        var resolution = size + size - 1; //5
//
//        if (size < 0) {
//            if (window.DEBUG)
//                console.log('readDataBits: size < 0');
//            return false;
//        }
//        if (!o_bitbuffer.initEncoder(size)) {
//            if (window.DEBUG)
//                console.log('readDataBits: initEncoder');
//            return false;
//        }
//        var cpara = this._cparam;
//
//        var ref_x = this._ref_x;
//        var ref_y = this._ref_y;
//        var pixcel_temp = this._pixcel_temp;
//        var cpara_0 = cpara[0];
//        var cpara_1 = cpara[1];
//        var cpara_3 = cpara[3];
//        var cpara_6 = cpara[6];
//        var th = i_th.th;
//        var p = 0;
//        for (var i = 0; i < resolution; i++) {
//            var i2;
//            // calculate the index values ​​of the pixels of one column.
//            var cy0 = 1 + index_y[i * 2 + 0];
//            var cy1 = 1 + index_y[i * 2 + 1];
//            var cpy0_12 = cpara_1 * cy0 + cpara[2];
//            var cpy0_45 = cpara[4] * cy0 + cpara[5];
//            var cpy0_7 = cpara[7] * cy0 + 1.0;
//            var cpy1_12 = cpara_1 * cy1 + cpara[2];
//            var cpy1_45 = cpara[4] * cy1 + cpara[5];
//            var cpy1_7 = cpara[7] * cy1 + 1.0;
//            var pt = 0;
//            for (i2 = 0; i2 < resolution; i2++) {
//                var d;
//                var cx0 = 1 + index_x[i2 * 2 + 0];
//                var cx1 = 1 + index_x[i2 * 2 + 1];
//                var cp6_0 = cpara_6 * cx0;
//                var cpx0_0 = cpara_0 * cx0;
//                var cpx3_0 = cpara_3 * cx0;
//                var cp6_1 = cpara_6 * cx1;
//                var cpx0_1 = cpara_0 * cx1;
//                var cpx3_1 = cpara_3 * cx1;
//                d = cp6_0 + cpy0_7;
//                console.log("d = " + d)
//                ref_x[pt] = toInt((cpx0_0 + cpy0_12) / d);
//                ref_y[pt] = toInt((cpx3_0 + cpy0_45) / d);
//                pt++;
//                d = cp6_0 + cpy1_7;
//                console.log("d = " + d)
//                ref_x[pt] = toInt((cpx0_0 + cpy1_12) / d);
//                ref_y[pt] = toInt((cpx3_0 + cpy1_45) / d);
//                pt++;
//                d = cp6_1 + cpy0_7;
//                console.log("d = " + d)
//                ref_x[pt] = toInt((cpx0_1 + cpy0_12) / d);
//                ref_y[pt] = toInt((cpx3_1 + cpy0_45) / d);
//                pt++;
//                d = cp6_1 + cpy1_7;
//                console.log("d = " + d)
//                ref_x[pt] = toInt((cpx0_1 + cpy1_12) / d);
//                ref_y[pt] = toInt((cpx3_1 + cpy1_45) / d);
//                pt++;
//            }
//            // (The person who wrote the only accessor is good in some cases) to get the pixel of one line
//            i_reader.getPixelSet(ref_x, ref_y, resolution * 4, pixcel_temp);
//
//            // While the gray scale, transfer to the line → map
//            for (i2 = 0; i2 < resolution; i2++) {
//                var index = i2 * 4;
//                var pixel = (pixcel_temp[index + 0] + pixcel_temp[index + 1] + pixcel_temp[index + 2] + pixcel_temp[index + 3]) / 4;
//                // 1 = bright point, 0 = dark point
//                o_bitbuffer.setBitByBitIndex(p, pixel > th ? 0 : 1);
//                p++;
//            }
//        }
//        this.setPreviousFrameSize(size, index_x, index_y);
//        return true;
//    }
//    ,
//    setSquare: function(i_vertex) {
//        if (!this._param_gen.getParam(i_vertex, this._cparam)) {
//            return false;
//        }
//        return true;
//    }
//});

// reading NyARColorPatt_NyIdMarker. Conversion from raster Perspective
PerspectivePixelReader = ASKlass('PerspectivePixelReader', {
    _param_gen: new NyARPerspectiveParamGenerator_O1(1, 1, 100, 100),
    _cparam: new FloatVector(8),
    PerspectivePixelReader: function() {
        return;
    },
    maxPreviousFrameAge: 1
    ,
    newFrame: function() {
        for (var i in this.previousFrames) {
            var pf = this.previousFrames[i];
            pf.age++;
            if (pf.age > this.maxPreviousFrameAge) {
                delete this.previousFrames[i];
            }
        }
    }
    ,
    setSourceSquare: function(i_vertex) {
        var cx = 0, cy = 0;
        for (var i = 0; i < 4; i++) {
            cx += i_vertex[i].x;
            cy += i_vertex[i].y;
        }
        cx /= 4;
        cy /= 4;
        var qx = toInt(cx / 10);
        var qy = toInt(cy / 10);
        this.centerPoint[0] = qx;
        this.centerPoint[1] = qy;
        return this._param_gen.getParam(i_vertex, this._cparam);
    }
    ,
    // cut out from a rectangular pixel
    // @param o_pixel = first index of the storage location
    rectPixels: function(i_reader, i_raster_size, i_lt_x, i_lt_y, i_step_x, i_step_y, i_width, i_height, i_out_st, o_pixel) {
        var cpara = this._cparam;
        var ref_x = this._ref_x;
        var ref_y = this._ref_y;
        var pixcel_temp = this._pixcel_temp;
        var raster_width = i_raster_size.w;
        var raster_height = i_raster_size.h;
        var out_index = i_out_st;
        var cpara_6 = cpara[6];
        var cpara_0 = cpara[0];
        var cpara_3 = cpara[3];
        for (var i = 0; i < i_height; i++) {
            // calculate the index values ​​of the pixels of one column.
            var cy0 = 1 + i * i_step_y + i_lt_y;
            var cpy0_12 = cpara[1] * cy0 + cpara[2];
            var cpy0_45 = cpara[4] * cy0 + cpara[5];
            var cpy0_7 = cpara[7] * cy0 + 1.0;
            var pt = 0;
            var i2;
            for (i2 = 0; i2 < i_width; i2++) {
                var cx0 = 1 + i2 * i_step_x + i_lt_x;
                var d = cpara_6 * cx0 + cpy0_7;
                var x = toInt((cpara_0 * cx0 + cpy0_12) / d);
                var y = toInt((cpara_3 * cx0 + cpy0_45) / d);
                if (x < 0 || y < 0 || x >= raster_width || y >= raster_height) {
                    return false;
                }
                ref_x[pt] = x;
                ref_y[pt] = y;
                pt++;
            }
            // (The person who wrote the only accessor is good in some cases) to get the pixel of one line
            i_reader.getPixelSet(ref_x, ref_y, i_width, pixcel_temp);
            // While the gray scale, transfer to the line → map
            for (i2 = 0; i2 < i_width; i2++) {
                var index = i2;
                o_pixel[out_index] = pixcel_temp[index];
                out_index++;
            }
        }
        return true;
    }
    ,
    // the period of the zero-crossing point in the i_freq, Check for regular intervals
    // The next stage and a half period is greater than 80% of the previous stage, 
    // it is considered to be equally spaced period, those which are less than 120%
    checkFreqWidth: function(i_freq, i_width) {
        var c = i_freq[1] - i_freq[0];
        var count = i_width * 2 - 1;
        for (var i = 1; i < count; i++) {
            var n = i_freq[i + 1] - i_freq[i];
            var v = n * 100 / c;
            if (v > 150 || v < 50) {
                return false;
            }
            c = n;
        }
        return true;
    }
    ,
    // Investigate the contents of i_freq_table and i_freq_count_table, and returns the largest frequency component
    // return Greater than or equal to zero, less than zero if Tsurakere dense if found 
    getMaxFreq: function(i_freq_count_table, i_freq_table, o_freq_table) {
        // get a larger component of most
        var index = -1;
        var max = 0;
        var i;
        console.log("getMaxFreq:")
        console.log(i_freq_count_table)
        for (i = 0; i < this.MAX_FREQ; i++) {
            if (max < i_freq_count_table[i]) {
                index = i;
                max = i_freq_count_table[i];
            }
        }
        return index;
    },
    // (It this.FRQ_POINTS * this.FRQ_STEP does not exceed 100) parameters of timing pattern
    FRQ_EDGE: 10,
    FRQ_STEP: 2,
    FRQ_POINTS: (100 - (10/*FRQ_EDGE*/ * 2)) / 2, //FRQ_STEP
    MIN_FREQ: 1,
    MAX_FREQ: 2,
    FREQ_SAMPLE_NUM: 4,
    MAX_DATA_BITS: 3 + 3/*MAX_FREQ + MAX_FREQ*/ - 1,
    _ref_x: new IntVector(108),
    _ref_y: new IntVector(108),
    // whichever is greater this.THRESHOLD_PIXEL * 3 and (model +1) * 4 * 3
    _pixcel_temp: new IntVector(108),
    _freq_count_table: new IntVector(3/*MAX_FREQ*/),
    _freq_table: new IntVector((3/*MAX_FREQ*/ * 2 - 1) * 3/*MAX_FREQ*/ * 2 / 2)
    ,
    // By averaging the i_y2 line and i_y1 line, you get the frequency of the timing pattern. 
    // As one cycle LHL, for example, return 2 for LHLHL. The pattern level of the beginning and end of HLHL such as LHLH different 
    // @param o_edge_index = array that receives the index (H-> L, L-> H) edge of the detected position
    getRowFrequency: function(i_reader, i_raster_size, i_y1, i_th_h, i_th_l, o_edge_index) {
        var i;
        var freq_count_table = this._freq_count_table; // 3,4,5,6,7,8,9,10        
        var freq_table = this._freq_table; // Array with elements of 0,2,4,6,8,10,12,14,16,18,20
        //Initialization
        var cpara = this._cparam;
        var ref_x = this._ref_x;
        var ref_y = this._ref_y;
        var pixcel_temp = this._pixcel_temp;
        for (i = 0; i < 10; i++) {
            freq_count_table[i] = 0;
        }
        for (i = 0; i < 110; i++) {
            freq_table[i] = 0;
        }
        var raster_width = i_raster_size.w;
        var raster_height = i_raster_size.h;
        var cpara_0 = cpara[0];
        var cpara_3 = cpara[3];
        var cpara_6 = cpara[6];
        var cv;
        if (window.DEBUG) {
            cv = document.getElementById('debugCanvas').getContext('2d');
            cv.fillStyle = 'orange';
        }
        // To detect the timing pattern from 10-20 th pixel
        for (i = 0; i < this.FREQ_SAMPLE_NUM; i++) {
            var i2;
            // Calculate the pixel index of two lines
            var cy0 = 1 + i_y1 + i; // this.FRQ_STEP * 5 + this.FRQ_EDGE
            var cpy0_12 = cpara[1] * cy0 + cpara[2];
            var cpy0_45 = cpara[4] * cy0 + cpara[5];
            var cpy0_7 = cpara[7] * cy0 + 1.0;
            var pt = 0;
            for (i2 = 0; i2 < this.FRQ_POINTS; i2++) {
                var cx0 = 1 + i2 * this.FRQ_STEP + this.FRQ_EDGE;
                var d = (cpara_6 * cx0) + cpy0_7;
                var x = toInt((cpara_0 * cx0 + cpy0_12) / d);
                var y = toInt((cpara_3 * cx0 + cpy0_45) / d);
                if (x < 0 || y < 0 || x >= raster_width || y >= raster_height) {
                    return -1;
                }
                ref_x[pt] = x;
                ref_y[pt] = y;
                pt++;
            }
            // (By adjusting the tip from here If diversify input image) enrolled in pixels
            i_reader.getPixelSet(ref_x, ref_y, this.FRQ_POINTS, pixcel_temp);
            if (window.DEBUG) {
                for (var j = 0; j < this.FRQ_POINTS; j++) {
                    cv.fillRect(ref_x[j], ref_y[j], 1, 1);
                }
            }
            // to investigate to destroy temporarily o_edge_index
            var freq_t = this.getFreqInfo(pixcel_temp, i_th_h, i_th_l, o_edge_index);

            if (freq_t < this.MIN_FREQ || freq_t > this.MAX_FREQ) { // Period should be a 3-10
                continue;
            }
            if (!this.checkFreqWidth(o_edge_index, freq_t)) { // Period to be equally spaced
                continue;
            }

            freq_count_table[freq_t]++; // Added detection counter
            var table_st = (freq_t - 1) * freq_t;
            for (i2 = 0; i2 < freq_t * 2; i2++) {
                freq_table[table_st + i2] += o_edge_index[i2];
            }
        }
        return this.getMaxFreq(freq_count_table, freq_table, o_edge_index);
    }
    ,
    getColFrequency: function(i_reader, i_raster_size, i_x1, i_th_h, i_th_l, o_edge_index) {
        var i;
        var cpara = this._cparam;
        var ref_x = this._ref_x;
        var ref_y = this._ref_y;
        var pixcel_temp = this._pixcel_temp;
        //0,2,4,6,8,10,12,14,16,18,20=(11*20)/2=110
        //Initialization
        var freq_count_table = this._freq_count_table;
        for (i = 0; i < 10; i++) {
            freq_count_table[i] = 0;
        }
        var freq_table = this._freq_table;
        for (i = 0; i < 110; i++) {
            freq_table[i] = 0;
        }
        var raster_width = i_raster_size.w;
        var raster_height = i_raster_size.h;
        var cpara7 = cpara[7];
        var cpara4 = cpara[4];
        var cpara1 = cpara[1];
        var cv;
        if (window.DEBUG) {
            cv = document.getElementById('debugCanvas').getContext('2d');
            cv.fillStyle = 'green';
        }
        // The extracted as a reference pattern 4 pixels from the reference point
        for (i = 0; i < this.FREQ_SAMPLE_NUM; i++) {
            var i2;
            var cx0 = 1 + i/**this.FRQ_STEP*5+this.FRQ_EDGE*/ + i_x1;
            var cp6_0 = cpara[6] * cx0;
            var cpx0_0 = cpara[0] * cx0 + cpara[2];
            var cpx3_0 = cpara[3] * cx0 + cpara[5];
            var pt = 0;
            for (i2 = 0; i2 < this.FRQ_POINTS; i2++)
            {
                var cy = 1 + i2 * this.FRQ_STEP + this.FRQ_EDGE;
                var d = cp6_0 + cpara7 * cy + 1.0;
                var x = toInt((cpx0_0 + cpara1 * cy) / d);
                var y = toInt((cpx3_0 + cpara4 * cy) / d);
                if (x < 0 || y < 0 || x >= raster_width || y >= raster_height)
                {
                    return -1;
                }
                ref_x[pt] = x;
                ref_y[pt] = y;
                pt++;
            }
            // (Can be adjusted here if you diversify the input image) enrolled in pixels
            i_reader.getPixelSet(ref_x, ref_y, this.FRQ_POINTS, pixcel_temp);
            if (window.DEBUG) {
                for (var j = 0; j < this.FRQ_POINTS; j++) {
                    cv.fillRect(ref_x[j], ref_y[j], 1, 1);
                }
            }
            var freq_t = this.getFreqInfo(pixcel_temp, i_th_h, i_th_l, o_edge_index);
            // Period should be a 3-10
            if (freq_t < this.MIN_FREQ || freq_t > this.MAX_FREQ) {
                continue;
            }
            // Period to be equally spaced
            if (!this.checkFreqWidth(o_edge_index, freq_t)) {
                continue;
            }
            // Added detection counter
            freq_count_table[freq_t]++;
            var table_st = (freq_t - 1) * freq_t;
            for (i2 = 0; i2 < freq_t * 2; i2++) {
                freq_table[table_st + i2] += o_edge_index[i2];
            }
        }
        return this.getMaxFreq(freq_count_table, freq_table, o_edge_index);
    }
    ,
    // Contact k in the static you have finished debugging
    getFreqInfo: function(i_pixcels, i_th_h, i_th_l, o_edge_index) {
        // By analyzing the token, to calculate the frequency
        var i = 0;
        var frq_l2h = 0;
        var frq_h2l = 0;
        var index, pix;
        while (i < this.FRQ_POINTS) {
            // detect the L-> H token
            while (i < this.FRQ_POINTS) {
                index = i;
                pix = i_pixcels[index];
                if (pix > i_th_h) {
                    // Token discovery
                    o_edge_index[frq_l2h + frq_h2l] = i;
                    frq_l2h++;
                    break;
                }
                i++;
            }
            i++;
            // detect the L-> H token
            while (i < this.FRQ_POINTS) {
                index = i;
                pix = i_pixcels[index];
                if (pix <= i_th_l) {
                    // Token discovery
                    o_edge_index[frq_l2h + frq_h2l] = i;
                    frq_h2l++;
                    break;
                }
                i++;
            }
            i++;
        }
        return frq_l2h == frq_h2l ? frq_l2h : -1;
    },
    THRESHOLD_EDGE: 10,
    THRESHOLD_STEP: 2,
    THRESHOLD_WIDTH: 20,
    THRESHOLD_PIXEL: 20 / 2, // this.THRESHOLD_WIDTH/this.THRESHOLD_STEP
    THRESHOLD_SAMPLE: 10 * 10, // this.THRESHOLD_PIXEL*this.THRESHOLD_PIXEL
    THRESHOLD_SAMPLE_LT: 10, // this.THRESHOLD_EDGE,
    THRESHOLD_SAMPLE_RB: 100 - 20 - 10 // this.THRESHOLD_WIDTH-this.THRESHOLD_EDGE
    ,
    // ask the average pixel value of the upper pixel array, of 4 pixels lower
    // determine the threshold of two-way Ptail method that occupies the area of (4/i_pixcel.length)
    getPtailHighAndLow: function(i_pixcel, i_out) {
        var h3, h2, h1, h0, l3, l2, l1, l0;
        h3 = h2 = h1 = h0 = l3 = l2 = l1 = l0 = i_pixcel[0];
        for (var i = i_pixcel.length - 1; i >= 1; i--) {
            var pix = i_pixcel[i];
            if (h0 < pix) {
                if (h1 < pix) {
                    if (h2 < pix) {
                        if (h3 < pix) {
                            h0 = h1;
                            h1 = h2;
                            h2 = h3;
                            h3 = pix;
                        } else {
                            h0 = h1;
                            h1 = h2;
                            h2 = pix;
                        }
                    } else {
                        h0 = h1;
                        h1 = pix;
                    }
                } else {
                    h0 = pix;
                }
            }
            if (l0 > pix) {
                if (l1 > pix) {
                    if (l2 > pix) {
                        if (l3 > pix) {
                            l0 = l1;
                            l1 = l2;
                            l2 = l3;
                            l3 = pix;
                        } else {
                            l0 = l1;
                            l1 = l2;
                            l2 = pix;
                        }
                    } else {
                        l0 = l1;
                        l1 = pix;
                    }
                } else {
                    l0 = pix;
                }
            }
        }
        i_out.l = (l0 + l1 + l2 + l3) / 4;
        i_out.h = (h0 + h1 + h2 + h3) / 4;
        return;
    },
    __detectThresholdValue_hl: new THighAndLow(),
    __detectThresholdValue_tpt: new NyARIntPoint2d(),
    _th_pixels: new IntVector(10 * 10/*this.THRESHOLD_SAMPLE*/ * 4)
    ,
    // Investigate the pixel value of the specified location, and returns by calculating the threshold.
    detectThresholdValue: function(i_reader, i_raster_size, o_threshold) {
        var th_pixels = this._th_pixels;
        // obtain a pixel from the pick-up area in the upper left (00-24)
        this.rectPixels(i_reader, i_raster_size, this.THRESHOLD_SAMPLE_LT, this.THRESHOLD_SAMPLE_LT, this.THRESHOLD_STEP, this.THRESHOLD_STEP, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, 0, th_pixels);
        // obtain a pixel from the pick-up area at the bottom left (25-49)
        this.rectPixels(i_reader, i_raster_size, this.THRESHOLD_SAMPLE_LT, this.THRESHOLD_SAMPLE_RB, this.THRESHOLD_STEP, this.THRESHOLD_STEP, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, this.THRESHOLD_SAMPLE, th_pixels);
        // obtain a pixel from the pick-up area in the upper right corner (50-74)
        this.rectPixels(i_reader, i_raster_size, this.THRESHOLD_SAMPLE_RB, this.THRESHOLD_SAMPLE_LT, this.THRESHOLD_STEP, this.THRESHOLD_STEP, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, this.THRESHOLD_SAMPLE * 2, th_pixels);
        // obtain a pixel from the pick-up area in the lower right (75-99)
        this.rectPixels(i_reader, i_raster_size, this.THRESHOLD_SAMPLE_RB, this.THRESHOLD_SAMPLE_RB, this.THRESHOLD_STEP, this.THRESHOLD_STEP, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, this.THRESHOLD_SAMPLE * 3, th_pixels);
        var hl = this.__detectThresholdValue_hl;

        this.getPtailHighAndLow(th_pixels, hl); // Pixel average obtained in Ptail

        var th = (hl.h + hl.l) / 2; // Threshold center

        var th_sub = (hl.h - hl.l) / 5; // Hysteresis (20% of the difference)
        o_threshold.th = th;
        o_threshold.th_h = th + th_sub; // With hysteresis threshold
        o_threshold.th_l = th - th_sub; // With hysteresis threshold
        // Calculation (bright point center of gravity) the edge
        var lt_x, lt_y, lb_x, lb_y, rt_x, rt_y, rb_x, rb_y;
        var tpt = this.__detectThresholdValue_tpt;
        //LT
        if (this.getHighPixelCenter(0, th_pixels, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, th, tpt)) {
            lt_x = tpt.x * this.THRESHOLD_STEP;
            lt_y = tpt.y * this.THRESHOLD_STEP;
        } else {
            lt_x = 11;
            lt_y = 11;
        }
        //LB
        if (this.getHighPixelCenter(this.THRESHOLD_SAMPLE * 1, th_pixels, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, th, tpt)) {
            lb_x = tpt.x * this.THRESHOLD_STEP;
            lb_y = tpt.y * this.THRESHOLD_STEP;
        } else {
            lb_x = 11;
            lb_y = -1;
        }
        //RT
        if (this.getHighPixelCenter(this.THRESHOLD_SAMPLE * 2, th_pixels, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, th, tpt)) {
            rt_x = tpt.x * this.THRESHOLD_STEP;
            rt_y = tpt.y * this.THRESHOLD_STEP;
        } else {
            rt_x = -1;
            rt_y = 11;
        }
        //RB
        if (this.getHighPixelCenter(this.THRESHOLD_SAMPLE * 3, th_pixels, this.THRESHOLD_PIXEL, this.THRESHOLD_PIXEL, th, tpt)) {
            rb_x = tpt.x * this.THRESHOLD_STEP;
            rb_y = tpt.y * this.THRESHOLD_STEP;
        } else {
            rb_x = -1;
            rb_y = -1;
        }
        // Determination of the tracking start position
        o_threshold.lt_x = (lt_x + lb_x) / 2 + this.THRESHOLD_SAMPLE_LT - 1;
        o_threshold.rb_x = (rt_x + rb_x) / 2 + this.THRESHOLD_SAMPLE_RB + 1;
        o_threshold.lt_y = (lt_y + rt_y) / 2 + this.THRESHOLD_SAMPLE_LT - 1;
        o_threshold.rb_y = (lb_y + rb_y) / 2 + this.THRESHOLD_SAMPLE_RB + 1;
        return;
    }
    ,
    getHighPixelCenter: function(i_st, i_pixels, i_width, i_height, i_th, o_point) {
        var rp = i_st;
        var pos_x = 0;
        var pos_y = 0;
        var number_of_pos = 0;
        for (var i = 0; i < i_height; i++) {
            for (var i2 = 0; i2 < i_width; i2++) {
                if (i_pixels[rp++] > i_th) {
                    pos_x += i2;
                    pos_y += i;
                    number_of_pos++;
                }
            }
        }
        if (number_of_pos > 0) {
            pos_x /= number_of_pos;
            pos_y /= number_of_pos;
        } else {
            return false;
        }
        o_point.x = pos_x;
        o_point.y = pos_y;
        return true;
    }
    ,
    __detectDataBitsIndex_freq_index1: new IntVector(40/*this.FRQ_POINTS*/)
    ,
    __detectDataBitsIndex_freq_index2: new IntVector(40/*this.FRQ_POINTS*/)
    ,
    detectDataBitsIndex: function(i_reader, i_raster_size, i_th, o_index_row, o_index_col) {
        var i;
        // Measure the frequency
        var freq_index1 = this.__detectDataBitsIndex_freq_index1;
        var freq_index2 = this.__detectDataBitsIndex_freq_index2;
        var lydiff = i_th.rb_y - i_th.lt_y;
        var frq_t = this.getRowFrequency(i_reader, i_raster_size, i_th.lt_y/*-0.25*this.FRQ_EDGE*/, i_th.th_h, i_th.th_l, freq_index1);
        var frq_b = this.getRowFrequency(i_reader, i_raster_size, i_th.rb_y/*-0.5*lydiff*/, i_th.th_h, i_th.th_l, freq_index2);

        // Create an index from the timing pattern
        var freq_h = 2, freq_v = 2;
        var index = [10, 30, 50, 70];

        for (i = 0; i < freq_h + freq_h - 1; i++) { //3
            o_index_row[i * 2] = ((index[i + 1] - index[i]) * 2 / 5 + index[i]) + this.FRQ_EDGE;
            o_index_row[i * 2 + 1] = ((index[i + 1] - index[i]) * 3 / 5 + index[i]) + this.FRQ_EDGE;
        }
        var lxdiff = i_th.rb_x - i_th.lt_x;
        var frq_l = this.getColFrequency(i_reader, i_raster_size, i_th.lt_x/*-0.25*this.FRQ_EDGE*/, i_th.th_h, i_th.th_l, freq_index1);
        var frq_r = this.getColFrequency(i_reader, i_raster_size, i_th.rb_x/*-0.5*lxdiff*/, i_th.th_h, i_th.th_l, freq_index2);

        console.log("frq_t = " + frq_t + " , frq_b = " + frq_b);
        console.log("frq_l = " + frq_l + " , frq_r = " + frq_r);

        // Frequency is decent?
        if (frq_l < 0 && frq_r < 0 && frq_t < 0 && frq_b < 0) {
            if (window.DEBUG)
                console.log('bad col or row frq');
            return -1;
        }

        for (i = 0; i < freq_v + freq_v - 1; i++) {
            o_index_col[i * 2] = ((index[i + 1] - index[i]) * 2 / 5 + index[i]) + this.FRQ_EDGE;
            o_index_col[i * 2 + 1] = ((index[i + 1] - index[i]) * 3 / 5 + index[i]) + this.FRQ_EDGE;
        }
        // The impossible Lv4 or more
        if (freq_v > this.MAX_FREQ) {
            if (window.DEBUG)
                console.log('too high freq', freq_v)
            return -1;
        }
        return freq_v;
    }
    ,
    __readDataBits_index_bit_x: new FloatVector(5/*MAX_DATA_BITS*/ * 2)
    ,
    __readDataBits_index_bit_y: new FloatVector(5/*MAX_DATA_BITS*/ * 2)
    ,
    previousFrames: {}
    ,
    centerPoint: new IntVector(2)
    ,
    getPreviousFrameSize: function(index_x, index_y) {
        var cx = this.centerPoint[0], cy = this.centerPoint[1];
        var pfs = this.previousFrames;
        var pf = (
                pfs[cx + ":" + cy] || pfs[(cx - 1) + ":" + cy] || pfs[(cx + 1) + ":" + cy] ||
                pfs[cx + ":" + (cy - 1)] || pfs[(cx - 1) + ":" + (cy - 1)] || pfs[(cx + 1) + ":" + (cy - 1)] ||
                pfs[cx + ":" + (cy + 1)] || pfs[(cx - 1) + ":" + (cy + 1)] || pfs[(cx + 1) + ":" + (cy + 1)]
                );
        if (!pf)
            return -1;
        index_x.set(pf.index_x);
        index_y.set(pf.index_y);
        return pf.size;
    }
    ,
    setPreviousFrameSize: function(size, index_x, index_y) {
        var pf = this.previousFrames[this.centerPoint[0] + ":" + this.centerPoint[1]];
        if (!pf) {
            pf = {age: 0, size: size, index_x: new FloatVector(index_x), index_y: new FloatVector(index_y)};
            this.previousFrames[this.centerPoint[0] + ":" + this.centerPoint[1]] = pf;
            return;
        }
        pf.age = 0;
        pf.size = size;
        pf.index_x.set(index_x);
        pf.index_y.set(index_y);
    }
    ,
    readDataBits: function(i_reader, i_raster_size, i_th, o_bitbuffer) {
        var index_x = this.__readDataBits_index_bit_x;
        var index_y = this.__readDataBits_index_bit_y;
        // Get the reading position
        var size = this.detectDataBitsIndex(i_reader, i_raster_size, i_th, index_x, index_y);
        if (size < 0) {
            size = this.getPreviousFrameSize(index_x, index_y);
        }
        var resolution = size + size - 1;
        if (size < 0) {
            if (window.DEBUG)
                console.log('readDataBits: size < 0');
            return false;
        }
        if (!o_bitbuffer.initEncoder(size)) {
            if (window.DEBUG)
                console.log('readDataBits: initEncoder');
            resolution = 3;
//            return false;
        }


        var cpara = this._cparam;
        var ref_x = this._ref_x;
        var ref_y = this._ref_y;
        var pixcel_temp = this._pixcel_temp;
        var cpara_0 = cpara[0];
        var cpara_1 = cpara[1];
        var cpara_3 = cpara[3];
        var cpara_6 = cpara[6];
        var th = i_th.th;
        var p = 0;
        for (var i = 0; i < resolution; i++) {
            var i2;
            // calculate the index values ​​of the pixels of one column.
            var cy0 = 1 + index_y[i * 2 + 0];
            var cy1 = 1 + index_y[i * 2 + 1];
            var cpy0_12 = cpara_1 * cy0 + cpara[2];
            var cpy0_45 = cpara[4] * cy0 + cpara[5];
            var cpy0_7 = cpara[7] * cy0 + 1.0;
            var cpy1_12 = cpara_1 * cy1 + cpara[2];
            var cpy1_45 = cpara[4] * cy1 + cpara[5];
            var cpy1_7 = cpara[7] * cy1 + 1.0;
            var pt = 0;
            for (i2 = 0; i2 < resolution; i2++) {
                var d;
                var cx0 = 1 + index_x[i2 * 2 + 0];
                var cx1 = 1 + index_x[i2 * 2 + 1];
                var cp6_0 = cpara_6 * cx0;
                var cpx0_0 = cpara_0 * cx0;
                var cpx3_0 = cpara_3 * cx0;
                var cp6_1 = cpara_6 * cx1;
                var cpx0_1 = cpara_0 * cx1;
                var cpx3_1 = cpara_3 * cx1;
                d = cp6_0 + cpy0_7;
                ref_x[pt] = toInt((cpx0_0 + cpy0_12) / d);
                ref_y[pt] = toInt((cpx3_0 + cpy0_45) / d);
                pt++;
                d = cp6_0 + cpy1_7;
                ref_x[pt] = toInt((cpx0_0 + cpy1_12) / d);
                ref_y[pt] = toInt((cpx3_0 + cpy1_45) / d);
                pt++;
                d = cp6_1 + cpy0_7;
                ref_x[pt] = toInt((cpx0_1 + cpy0_12) / d);
                ref_y[pt] = toInt((cpx3_1 + cpy0_45) / d);
                pt++;
                d = cp6_1 + cpy1_7;
                ref_x[pt] = toInt((cpx0_1 + cpy1_12) / d);
                ref_y[pt] = toInt((cpx3_1 + cpy1_45) / d);
                pt++;
            }


            // (The person who wrote the only accessor is good in some cases) to get the pixel of one line
            i_reader.getPixelSet(ref_x, ref_y, resolution * 4, pixcel_temp);
            // While the gray scale, transfer to the line → map
            for (i2 = 0; i2 < resolution; i2++) {
                var index = i2 * 4;
                var pixel = (pixcel_temp[index + 0] + pixcel_temp[index + 1] + pixcel_temp[index + 2] + pixcel_temp[index + 3]) / (4);
                // 1 = bright point, 0 = dark point
                o_bitbuffer.setBitByBitIndex(p, pixel > th ? 0 : 1);
                p++;
            }
        }
        this.setPreviousFrameSize(size, index_x, index_y);
        return true;
    }
    ,
    setSquare: function(i_vertex) {
        if (!this._param_gen.getParam(i_vertex, this._cparam)) {
            return false;
        }
        return true;
    }
});

MarkerPattDecoder = ASKlass('MarkerPattDecoder', {
    decode: function(model, domain, mask) {
    }
});

INyIdMarkerDataEncoder = ASKlass('INyIdMarkerDataEncoder', {
    encode: function(i_data, o_dest) {
    },
    createDataInstance: function() {
    }
});

IpickFromRaster_Impl = ASKlass('IpickFromRaster_Impl', {
    pickFromRaster: function(i_cpara, image, o_patt) {
    }
});

FLSingleARMarkerProcesser = ASKlass('FLSingleARMarkerProcesser', {
    tag: null, // It is a tag variable the owner's disposal
    _lost_delay_count: 0,
    _lost_delay: 5, //cinco
    _square_detect: null,
    _transmat: null,
    _offset: null,
    _threshold: 110,
    // [AR] Detectable Full save with results
    _bin_raster: null,
    _tobin_filter: null,
    _current_arcode_index: -1,
    _threshold_detect: null,
    FLSingleARMarkerProcesser: function() {
        return;
    },
    _initialized: false
    ,
    initInstance: function(i_param) {

        NyAS3Utils.assert(this._initialized == false); // Economic initialization?
        var scr_size = i_param.getScreenSize();

        this._square_detect = new FLARSquareContourDetector(scr_size); // make the analysis object
        this._transmat = new NyARTransMat(i_param);
        this._tobin_filter = new FLARRasterFilter_Threshold(110);

        this._bin_raster = new FLARBinRaster(scr_size.w, scr_size.h); // create a binary image buffer
        this._threshold_detect = new FLARRasterThresholdAnalyzer_SlidePTile(15, 4);
        this._initialized = true;
        // Callback handler
        this._detectmarker_cb = new FLARDetectSquareCB_1(i_param);
        this._offset = new NyARRectOffset();
        return;
    }
    ,
    // Specifies an array of marker code to detect. If you execute this function in the detection state,
    // Forced reset will be applied to the object state.
    setARCodeTable: function(i_ref_code_table, i_code_resolution, i_marker_width) {
        if (this._current_arcode_index != -1) {
            this.reset(true); // Forced reset
        }
        // To recreate the marker set to detect, information, a detector. (Pattern area 1 pixel sampling point 4, the marker is 50%)
        this._detectmarker_cb.setNyARCodeTable(i_ref_code_table, i_code_resolution);
        this._offset.setSquare(i_marker_width);
        return;
    }
    ,
    reset: function(i_is_force) {
        if (this._current_arcode_index != -1 && i_is_force == false) {
            this.onLeaveHandler(); // Events call If it is not forced rewrite
        }
        this._current_arcode_index = -1; // Reset the current marker
        return;
    },
    _detectmarker_cb: null
    ,
    detectMarker: function(i_raster) {
        NyAS3Utils.assert(this._bin_raster.getSize().isEqualSize_int(i_raster.getSize().w, i_raster.getSize().h)); // Size check
        // Conversion to BIN image
        this._tobin_filter.setThreshold(this._threshold);
        this._tobin_filter.doFilter(i_raster, this._bin_raster);
        // look for a square code
        this._detectmarker_cb.init(i_raster, this._current_arcode_index);
        this._square_detect.detectMarkerCB(this._bin_raster, this._detectmarker_cb);

        var is_id_found = updateStatus(this._detectmarker_cb.square, this._detectmarker_cb.code_index); // Recognizing the state update

        if (!is_id_found) { // (Also in detectExistMarker) threshold feedback
            // If there is no marker, reference luminance search in the search + DualPTail
            var th = this._threshold_detect.analyzeRaster(i_raster);
            this._threshold = (this._threshold + th) / 2;
        }
        return;
    }
    ,
    setConfidenceThreshold: function(i_new_cf, i_exist_cf) {
        this._detectmarker_cb.cf_threshold_exist = i_exist_cf;
        this._detectmarker_cb.cf_threshold_new = i_new_cf;
    }
    ,
    __NyARSquare_result: new FLARTransMatResult(),
    //  Updates the status of the object to drive the handle functions as necessary.
    // The return value is "or was able to discover a marker actually". It is different from the state of the class.
    updateStatus: function(i_square, i_code_index) {
        var result = this.__NyARSquare_result;
        if (this._current_arcode_index < 0) { // Not understanding
            if (i_code_index < 0) {
                return false; // that does nothing.

            } else { // Transition from recognition of unrecognized
                this._current_arcode_index = i_code_index;
                // Event generation
                // OnEnter
                this.onEnterHandler(i_code_index);
                // Create a transformation matrix
                this._transmat.transMat(i_square, this._offset, result);
                // OnUpdate
                this.onUpdateHandler(i_square, result);
                this._lost_delay_count = 0;
                return true;
            }
        } else { // Cognition
            if (i_code_index < 0) { // Unrecognized transition from the recognition
                this._lost_delay_count++;
                if (this._lost_delay < this._lost_delay_count) {
                    // OnLeave
                    this._current_arcode_index = -1;
                    this.onLeaveHandler();
                }
                return false;
            } else if (i_code_index == this._current_arcode_index) {// Re-recognition of same ARCode
                // Event generation
                // Create a transformation matrix
                this._transmat.transMat(i_square, this._offset, result);
                // OnUpdate
                this.onUpdateHandler(i_square, result);
                this._lost_delay_count = 0;
                return true;
            } else { // Does not support recognition → now different code.
                throw new NyARException();
            }
        }
    },
    onEnterHandler: function(i_code) {
        throw new NyARException("onEnterHandler not implemented.");
    },
    onLeaveHandler: function() {
        throw new NyARException("onLeaveHandler not implemented.");
    },
    onUpdateHandler: function(i_square, result) {
        throw new NyARException("onUpdateHandler not implemented.");
    }
});

FLARDetectSquareCB_1 = ASKlass('DetectSquareCB', {// callback function of detectMarker
    // Public properties
    square: new FLARSquare(),
    confidence: 0.0,
    code_index: -1,
    cf_threshold_new: 0.50,
    cf_threshold_exist: 0.30,
    _ref_raster: null, // Refer
    _inst_patt: null, // Owning instance
    _deviation_data: null,
    _match_patt: null,
    __detectMarkerLite_mr: new NyARMatchPattResult(),
    _coordline: null
    ,
    DetectSquareCB: function(i_param) {
        this._match_patt = null;
        this._coordline = new NyARCoord2Linear(i_param.getScreenSize(), i_param.getDistortionFactor());
        return;
    }
    ,
    setNyARCodeTable: function(i_ref_code, i_code_resolution) {
        // When implemented in unmanaged, it can be a resource release here.
        this._deviation_data = new NyARMatchPattDeviationColorData(i_code_resolution, i_code_resolution);
        this._inst_patt = new NyARColorPatt_Perspective_O2(i_code_resolution, i_code_resolution, 4, 25);
        this._match_patt = new Array(i_ref_code.length);
        for (var i = 0; i < i_ref_code.length; i++) {
            this._match_patt[i] = new NyARMatchPatt_Color_WITHOUT_PCA(i_ref_code[i]);
        }
    },
    __tmp_vertex: NyARIntPoint2d.createArray(4)
    , _target_id: 0
    ,
    init: function(i_raster, i_target_id) { // Initialize call back handler.
        this._ref_raster = i_raster;
        this._target_id = i_target_id;
        this.code_index = -1;
        this.confidence = Number.MIN_VALUE;
    }
    ,
    // called each time the rectangle is found
    // Inspect the rectangular pattern was found, to ensure the vertex data in consideration of the orientation
    onSquareDetect: function(i_sender, i_coordx, i_coordy, i_coor_num, i_vertex_index) {
        if (this._match_patt == null) {
            return;
        }
        // Convert to vertex list from the contour coordinate
        var vertex = this.__tmp_vertex;
        vertex[0].x = i_coordx[i_vertex_index[0]];
        vertex[0].y = i_coordy[i_vertex_index[0]];
        vertex[1].x = i_coordx[i_vertex_index[1]];
        vertex[1].y = i_coordy[i_vertex_index[1]];
        vertex[2].x = i_coordx[i_vertex_index[2]];
        vertex[2].y = i_coordy[i_vertex_index[2]];
        vertex[3].x = i_coordx[i_vertex_index[3]];
        vertex[3].y = i_coordy[i_vertex_index[3]];
        // Get the picture
        if (!this._inst_patt.pickFromRaster(this._ref_raster, vertex)) {
            return; // Failure to obtain
        }
        // Is evaluated by converting the color difference data acquisition pattern.
        this._deviation_data.setRaster(this._inst_patt);
        // get the data in, c1 code_index, dir.
        var mr = this.__detectMarkerLite_mr;
        var lcode_index = 0;
        var dir = 0;
        var c1 = 0;
        var i;
        for (i = 0; i < this._match_patt.length; i++) {
            this._match_patt[i].evaluate(this._deviation_data, mr);
            var c2 = mr.confidence;
            if (c1 < c2) {
                lcode_index = i;
                c1 = c2;
                dir = mr.direction;
            }
        }
        // Recognizing deal
        if (this._target_id == -1) { // Marker unrecognized            
            if (c1 < this.cf_threshold_new) { // Now not know
                return;
            }
            if (this.confidence > c1) {
                return; // Low degree of coincidence
            }
            this.code_index = lcode_index; // Save the marker ID that is recognized
        } else {
            // COGNITION
            // Did you recognize the current marker?
            if (lcode_index != this._target_id) {
                return; // Ignore, it is not a marker of recognition in
            }
            if (c1 < this.cf_threshold_exist) { //Or greater than the threshold of being recognized?
                return;
            }
            if (this.confidence > c1) { // Degree of coincidence greater than the current candidate?
                return;
            }
            this.code_index = this._target_id;
        }
        // Only when there is an update in the ongoing recognition or recognition, new, I want to update the information Square.
        // Above is executed only under this condition from here.
        // If there is a square having a high matching rate, to create a vertex information in consideration of the orientation
        this.confidence = c1;
        var sq = this.square;
        // In view of the direction, to update the square
        for (i = 0; i < 4; i++) {
            var idx = (i + 4 - dir) % 4;
            this._coordline.coord2Line(i_vertex_index[idx], i_vertex_index[(idx + 1) % 4], i_coordx, i_coordy, i_coor_num, sq.line[i]);
        }
        for (i = 0; i < 4; i++) {
            // Full straight intersection calculation with disabilities
            if (!NyARLinear.crossPos(sq.line[i], sq.line[(i + 3) % 4], sq.sqvertex[i])) {
                throw new NyARException(); // OK if the double buffer if an error return here
            }
        }
    }
});

FLSingleNyIdMarkerProcesser = ASKlass('FLSingleNyIdMarkerProcesser', {
    // It is a tag variable the owner's disposal.
    tag: null,
    _lost_delay_count: 0, // Management of Lost delay
    _lost_delay: 5, //cinco
    _square_detect: null,
    _transmat: null,
    _offset: null,
    _is_active: null,
    _current_threshold: 110,
    _bin_raster: null, // [AR] Detectable Full save with results
    _tobin_filter: null,
    _callback: null,
    _data_current: null,
    FLSingleNyIdMarkerProcesser: function() {
        return;
    }
    , _initialized: false
    ,
    initInstance: function(i_param, i_encoder, i_marker_width) {
        // Economic initialization?
        NyAS3Utils.assert(this._initialized == false);
        var scr_size = i_param.getScreenSize();
        // make the analysis object
        this._square_detect = new FLARSquareContourDetector(scr_size);
        this._transmat = new NyARTransMat(i_param);
        this._callback = new FLARDetectSquareCB_2(i_param, i_encoder);

        this._bin_raster = new FLARBinRaster(scr_size.w, scr_size.h); // create a binary image buffer
        // make two data objects for work
        this._data_current = i_encoder.createDataInstance();
        this._tobin_filter = new FLARRasterFilter_Threshold(110);
        this._threshold_detect = new FLARRasterThresholdAnalyzer_SlidePTile(15, 4);
        this._initialized = true;
        this._is_active = false;
        this._offset = new NyARRectOffset();
        this._offset.setSquare(i_marker_width);
        return;
    }
    ,
    setMarkerWidth: function(i_width) {
        this._offset.setSquare(i_width);
        return;
    }
    ,
    reset: function(i_is_force) {
        if (i_is_force == false && this._is_active) {
            // Events call If it is not forced rewrite
            this.onLeaveHandler();
        }
        // Marker invalid
        this._is_active = false;
        return;
    }
    ,
    detectMarker: function(i_raster) {

        if (!this._bin_raster.getSize().isEqualSize_int(i_raster.getSize().w, i_raster.getSize().h)) { // Size check
            throw new NyARException();
        }
        // converted to a binary raster image
        this._tobin_filter.setThreshold(this._current_threshold);
        this._tobin_filter.doFilter(i_raster, this._bin_raster);
        // find the square code (Find a new marker or markers, specified in the second argument)
        this._callback.init(i_raster, this._is_active ? this._data_current : null);
        this._square_detect.detectMarkerCB(this._bin_raster, this._callback);
        // update the state recognition (I feel that if you have discovered a marker, to pass current_data)
        var is_id_found = updateStatus(this._callback.square, this._callback.marker_data);
        // threshold feedback (Also in detectExistMarker) 
        if (is_id_found) {
            // If there is a marker, to reflect the peripheral threshold of the marker
            this._current_threshold = (this._current_threshold + this._callback.threshold) / 2;
        } else {
            // If there is no marker, reference luminance search in the search + DualPTail
            var th = this._threshold_detect.analyzeRaster(i_raster);
            this._current_threshold = (this._current_threshold + th) / 2;
        }
        return;
    }
    , _threshold_detect: null
    , __NyARSquare_result: new FLARTransMatResult()
    ,
    updateStatus: function(i_square, i_marker_data) { // Updates the status of the object to drive the handle functions as necessary
        var is_id_found = false;
        var result = this.__NyARSquare_result;
        if (!this._is_active) {// Not understanding
            if (i_marker_data == null) {// Did not know did not know Full migration
                // なにもしないよーん。
                this._is_active = false;
            } else {// Transition from recognition of unrecognized
                this._data_current.copyFrom(i_marker_data);
                // Event generation
                // OnEnter
                this.onEnterHandler(this._data_current);
                // Create a transformation matrix
                this._transmat.transMat(i_square, this._offset, result);
                // OnUpdate
                this.onUpdateHandler(i_square, result);
                this._lost_delay_count = 0;
                this._is_active = true;
                is_id_found = true;
            }
        } else {// Cognition
            if (i_marker_data == null) {
                // Unrecognized transition from the recognition
                this._lost_delay_count++;
                if (this._lost_delay < this._lost_delay_count) {
                    // OnLeave
                    this.onLeaveHandler();
                    this._is_active = false;
                }
            } else if (this._data_current.isEqual(i_marker_data)) {
                // Re-recognition of same id
                this._transmat.transMatContinue(i_square, this._offset, result);
                // OnUpdate
                this.onUpdateHandler(i_square, result);
                this._lost_delay_count = 0;
                is_id_found = true;
            } else {// Recognition of different codes → not supported now
                throw new NyARException();
            }
        }
        return is_id_found;
    }
    ,
    onEnterHandler: function(i_code) { // Notification handler
        throw new NyARException("onEnterHandler not implemented.");
    }
    ,
    onLeaveHandler: function() {
        throw new NyARException("onLeaveHandler not implemented.");
    }
    , onUpdateHandler: function(i_square, result) {
        throw new NyARException("onUpdateHandler not implemented.");
    }
});

FLARDetectSquareCB_2 = ASKlass('DetectSquareCB', {// callback function of detectMarker
    // Public properties
    square: new FLARSquare(),
    marker_data: null,
    threshold: 0,
    _ref_raster: null, //Refer            
    _current_data: null, // Owning instance
    _id_pickup: new NyIdMarkerPickup(),
    _coordline: null,
    _encoder: null,
    _data_temp: null,
    _prev_data: null,
    DetectSquareCB: function(i_param, i_encoder) {
        this._coordline = new NyARCoord2Linear(i_param.getScreenSize(), i_param.getDistortionFactor());
        this._data_temp = i_encoder.createDataInstance();
        this._current_data = i_encoder.createDataInstance();
        this._encoder = i_encoder;
        return;
    }
    ,
    __tmp_vertex: NyARIntPoint2d.createArray(4)
    ,
    init: function(i_raster, i_prev_data) { //Initialize call back handler
        this.marker_data = null;
        this._prev_data = i_prev_data;
        this._ref_raster = i_raster;
    }
    , _marker_param: new NyIdMarkerParam()
    , _marker_data: new NyIdMarkerPattern()
            // called each time the rectangle is found
            // Inspect the rectangular pattern was found, to ensure the vertex data in consideration of the orientation             
    ,
    onSquareDetect: function(i_sender, i_coordx, i_coordy, i_coor_num, i_vertex_index) {

        if (this.marker_data != null) { // End if found already
            return;
        }
        // Convert to vertex list from the contour coordinate
        var vertex = this.__tmp_vertex;
        vertex[0].x = i_coordx[i_vertex_index[0]];
        vertex[0].y = i_coordy[i_vertex_index[0]];
        vertex[1].x = i_coordx[i_vertex_index[1]];
        vertex[1].y = i_coordy[i_vertex_index[1]];
        vertex[2].x = i_coordx[i_vertex_index[2]];
        vertex[2].y = i_coordy[i_vertex_index[2]];
        vertex[3].x = i_coordx[i_vertex_index[3]];
        vertex[3].y = i_coordy[i_vertex_index[3]];
        var param = this._marker_param;
        var patt_data = this._marker_data;
        // cut out from the image a pattern of the evaluation criteria
        if (!this._id_pickup.pickFromRaster(this._ref_raster, vertex, patt_data, param)) {
            return;
        }

        if (!this._encoder.encode(patt_data, this._data_temp)) { // Encode
            return;
        }
        // continued recognition request?
        if (this._prev_data == null) {
            this._current_data.copyFrom(this._data_temp); // No continuation recognition request
        } else {

            if (!this._prev_data.isEqual((this._data_temp))) { // There is continued recognition request
                return; // Is this different from a ID that had recognized claims.
            }
        }
        // Only when there is an update in the ongoing recognition or recognition, new, I want to update the information Square
        // Above is executed only under this condition from here
        var sq = this.square;
        // In view of the direction, to update the square
        var i;
        for (i = 0; i < 4; i++) {
            var idx = (i + 4 - param.direction) % 4;
            this._coordline.coord2Line(i_vertex_index[idx], i_vertex_index[(idx + 1) % 4], i_coordx, i_coordy, i_coor_num, sq.line[i]);
        }
        for (i = 0; i < 4; i++) {
            // Full straight intersection calculation with disabilities
            if (!NyARLinear.crossPos(sq.line[i], sq.line[(i + 3) % 4], sq.sqvertex[i])) {
                throw new NyARException(); // OK if the double buffer if an error return here
            }
        }
        this.threshold = param.threshold;
        this.marker_data = this._current_data; // Found
    }
});

NyARCustomSingleDetectMarker = ASKlass('NyARCustomSingleDetectMarker', {
    _is_continue: false,
    _square_detect: null,
    _transmat: null,
    //Image processing
    _bin_raster: null,
    _tobin_filter: null,
    _detect_cb: null,
    _offset: null,
    NyARCustomSingleDetectMarker: function() {
        return;
    }
    ,
    initInstance: function(i_patt_inst, i_sqdetect_inst, i_transmat_inst, i_filter, i_ref_param, i_ref_code, i_marker_width) {
        var scr_size = i_ref_param.getScreenSize();
        // make the analysis object
        this._square_detect = i_sqdetect_inst;
        this._transmat = i_transmat_inst;
        this._tobin_filter = i_filter;

        this._bin_raster = new NyARBinRaster(scr_size.w, scr_size.h); // create a binary image buffer        
        this._detect_cb = new DetectSquareCB_3(i_patt_inst, i_ref_code, i_ref_param);
        this._offset = new NyARRectOffset(); // Create offset
        this._offset.setSquare(i_marker_width);
        return;
    }
    ,
    // Run the marker detection process i_image, and record the results
    // @Param i_raster = image to detect the marker (size, camera parameters)
    detectMarkerLiteB: function(i_raster) { // return if marker is detected
        if (!this._bin_raster.getSize().isEqualSize_NyARIntSize(i_raster.getSize())) { // Size check
            throw new NyARException();
        }
        this._tobin_filter.doFilter(i_raster, this._bin_raster); // convert to binary raster image        
        this._detect_cb.init(i_raster); // Preparing for callback handler
        // Find the rectangle (the return value. Receive the callback function)
        this._square_detect.detectMarkerCB(this._bin_raster, _detect_cb);
        if (this._detect_cb.confidence == 0) {
            return false;
        }
        return true;
    }
    ,
    // not use detectMarkerLite, you ran just before has not been successful
    // @param o_result = object that receives the transformation matrix
    getTransmationMatrix: function(o_result) { // returns to o_result transformation matrix of detected markers

        // Calculate neighborhood such as the position of the marker that matches most
        if (this._is_continue) {
            this._transmat.transMatContinue(this._detect_cb.square, this._offset, o_result);
        } else {
            this._transmat.transMat(this._detect_cb.square, this._offset, o_result);
        }
        return;
    },
    refSquare: function() { // return the current rectangle.
        return this._detect_cb.square;
    }
    ,
    getConfidence: function() { // return degree marker match (0 to 1). low degree = higher erroneous recognition
        return this._detect_cb.confidence;
    }
    ,
    // @param i_is_continue = if TRUE, get compatible transMatCont. if FALSE, get compatible transMat
    setContinueMode: function(i_is_continue) { //set the calculation mode of getTransmationMatrix. default = TRUE
        this._is_continue = i_is_continue;
    }
});

DetectSquareCB_3 = ASKlass('DetectSquareCB', NyARSquareContourDetector_IDetectMarkerCallback, {// detectMarker callback function
    // Public properties
    confidence: 0,
    square: new NyARSquare(),
    // Reference instance
    _ref_raster: null,
    // Owning instance
    _inst_patt: null,
    _deviation_data: null,
    _match_patt: null,
    __detectMarkerLite_mr: new NyARMatchPattResult(),
    _coordline: null
    ,
    DetectSquareCB: function(i_inst_patt, i_ref_code, i_param) {
        this._inst_patt = i_inst_patt;
        this._deviation_data = new NyARMatchPattDeviationColorData(i_ref_code.getWidth(), i_ref_code.getHeight());
        this._coordline = new NyARCoord2Linear(i_param.getScreenSize(), i_param.getDistortionFactor());
        this._match_patt = new NyARMatchPatt_Color_WITHOUT_PCA(i_ref_code);
        return;
    },
    __tmp_vertex: NyARIntPoint2d.createArray(4)
    ,
    // called each time the rectangle is found
    // inspect the rectangular pattern was found, to ensure the vertex data in consideration of the orientation
    onSquareDetect: function(i_sender, i_coordx, i_coordy, i_coor_num, i_vertex_index) {
        var i;
        var mr = this.__detectMarkerLite_mr;
        // Convert to vertex list from the contour coordinate
        var vertex = this.__tmp_vertex;
        vertex[0].x = i_coordx[i_vertex_index[0]];
        vertex[0].y = i_coordy[i_vertex_index[0]];
        vertex[1].x = i_coordx[i_vertex_index[1]];
        vertex[1].y = i_coordy[i_vertex_index[1]];
        vertex[2].x = i_coordx[i_vertex_index[2]];
        vertex[2].y = i_coordy[i_vertex_index[2]];
        vertex[3].x = i_coordx[i_vertex_index[3]];
        vertex[3].y = i_coordy[i_vertex_index[3]];

        if (!this._inst_patt.pickFromRaster(this._ref_raster, vertex)) { // get the picture
            return;
        }
        // is evaluated by converting the color difference data acquisition pattern
        this._deviation_data.setRaster(this._inst_patt);
        if (!this._match_patt.evaluate(this._deviation_data, mr)) {
            return;
        }

        if (this.confidence > mr.confidence) { // Exit is lower than the current rate of match
            return;
        }
        // if high matching rate square, create vertex information whith the orientation
        var sq = this.square;
        this.confidence = mr.confidence;
        // update the square in view of the direction
        for (i = 0; i < 4; i++) {
            var idx = (i + 4 - mr.direction) % 4;
            this._coordline.coord2Line(i_vertex_index[idx], i_vertex_index[(idx + 1) % 4], i_coordx, i_coordy, i_coor_num, sq.line[i]);
        }
        for (i = 0; i < 4; i++) {
            // full straight intersection calculation with disabilities
            if (!NyARLinear.crossPos(sq.line[i], sq.line[(i + 3) % 4], sq.sqvertex[i])) {
                throw new NyARException(); // OK if the double buffer if an error return here
            }
        }
    },
    init: function(i_raster) {
        this.confidence = 0;
        this._ref_raster = i_raster;
    }
});

// Class Search by AR code registered in the constructor, an AR code to detect multiple markers, best matches in each. 
// Approximately 100 is the limit to recognize up to 300, but as you might recognize the Gomiraberu.
NyARDetectMarker = ASKlass('NyARDetectMarker', {
    _detect_cb: null,
    AR_SQUARE_MAX: 300,
    _is_continue: false,
    _square_detect: null,
    _transmat: null,
    _offset: null
    ,
    // Make the object to search from the i_code ARCode to detect a plurality of markers, the best match.
    // @param i_param = camera parameters
    // @param i_code = array ARCode of index marker detected. obtained by getARCodeIndex
    // @param i_marker_width = marker i_code array size (mm)
    // @param i_number_of_code = number of ARCode included in the i_code
    // @param i_input_raster_type = pixel type of the input raster. of getBufferType of INyARBufferReader interface
    NyARDetectMarker: function(i_param, i_code, i_marker_width, i_number_of_code, i_input_raster_type) {
        this.initInstance(i_param, i_code, i_marker_width, i_number_of_code, i_input_raster_type);
        return;
    }
    ,
    initInstance: function(i_ref_param, i_ref_code, i_marker_width, i_number_of_code, i_input_raster_type) {
        var scr_size = i_ref_param.getScreenSize();
        // make the analysis object
        var cw = i_ref_code[0].getWidth();
        var ch = i_ref_code[0].getHeight();
        // callback function of detectMarker
        this._detect_cb = new NyARDetectSquareCB(
                new NyARColorPatt_Perspective_O2(cw, ch, 4, 25),
                i_ref_code, i_number_of_code, i_ref_param);
        this._transmat = new NyARTransMat(i_ref_param);
        // NyARToolkit profile
        this._square_detect = new NyARSquareContourDetector_Rle(i_ref_param.getScreenSize());
        this._tobin_filter = new NyARRasterFilter_ARToolkitThreshold(100, i_input_raster_type);
        // Actual size save
        this._offset = NyARRectOffset.createArray(i_number_of_code);
        for (var i = 0; i < i_number_of_code; i++) {
            this._offset[i].setSquare(i_marker_width[i]);
        }

        this._bin_raster = new NyARBinRaster(scr_size.w, scr_size.h); // create a binary image buffer
        return;
    },
    _bin_raster: null,
    _tobin_filter: null
    ,
    // Run the marker detection process i_image, and record the results.
    // @param i_raster = image to detect the marker
    // @param i_thresh = detection threshold (0 to 255). as much 100-130 usually
    detectMarkerLite: function(i_raster, i_threshold) { // return number markers found. if marker not found = 0
        if (!this._bin_raster.getSize().isEqualSize_NyARIntSize(i_raster.getSize())) { // Size check
            throw new NyARException();
        }
        // converted to a binary raster image.
        (NyARRasterFilter_ARToolkitThreshold(this._tobin_filter)).setThreshold(i_threshold);
        this._tobin_filter.doFilter(i_raster, this._bin_raster);

        this._detect_cb.init(i_raster); //detect
        this._square_detect.detectMarkerCB(this._bin_raster, this._detect_cb);

        return this._detect_cb.result_stack.getLength(); // return the number found
    }
    ,
    // transformation matrix for the marker of i_index, and stores to o_result the result value. You can not use detectMarkerLite you ran just before has not been successful
    // @param i_index = index number of the marker. >= 0 && < of detectMarkerLite function ran before
    // @param o_result = object that receives the result value.
    getTransmationMatrix: function(i_index, o_result) {
        var result = this._detect_cb.result_stack.getItem(i_index);
        // neighborhood such as the position of the marker that matches most
        if (_is_continue) {
            _transmat.transMatContinue(result.square, this._offset[result.arcode_id], o_result);
        } else {
            _transmat.transMat(result.square, this._offset[result.arcode_id], o_result);
        }
        return;
    }
    ,
    // @param i_index = index number of the marker. >=0 && < of detectMarkerLite function ran before    
    getConfidence: function(i_index) { // return degree marker match (0 to 1). low degree = higher erroneous recognition
        return this._detect_cb.result_stack.getItem(i_index).confidence;
    }
    ,
    // @param i_index = marker index. >= 0 && < of detectMarkerLite function ran before
    getARCodeIndex: function(i_index) { // return the index of ARCode marker of i_index.
        return this._detect_cb.result_stack.getItem(i_index).arcode_id;
    }
    ,
    // @param i_is_continue = If TRUE, use the transMatContinue. If FALSE, use the transMat.
    setContinueMode: function(i_is_continue) { // set the calculation mode of getTransmationMatrix.
        this._is_continue = i_is_continue;
    }
});

NyARDetectMarkerResult = ASKlass('NyARDetectMarkerResult', {
    arcode_id: 0,
    confidence: 0,
    square: new NyARSquare()
});

NyARDetectMarkerResultStack = ASKlass('NyARDetectMarkerResultStack ', NyARObjectStack, {
    NyARDetectMarkerResultStack: function(i_length) {
        NyARObjectStack.initialize.call(this, i_length);
    }
    ,
    createArray: function(i_length) {
        var ret = new Array(i_length);
        for (var i = 0; i < i_length; i++) {
            ret[i] = new NyARDetectMarkerResult();
        }
        return (ret);
    }
});

NyARDetectSquareCB = ASKlass('NyARDetectSquareCB ', NyARSquareContourDetector_IDetectMarkerCallback, {
    // Public properties
    result_stack: new NyARDetectMarkerResultStack(NyARDetectMarker.AR_SQUARE_MAX),
    // Reference instance
    _ref_raster: null,
    // Owning instance
    _inst_patt: null,
    _deviation_data: null,
    _match_patt: null,
    __detectMarkerLite_mr: new NyARMatchPattResult(),
    _coordline: null
    ,
    NyARDetectSquareCB: function(i_inst_patt, i_ref_code, i_num_of_code, i_param) {
        var cw = i_ref_code[0].getWidth();
        var ch = i_ref_code[0].getHeight();
        this._inst_patt = i_inst_patt;
        this._coordline = new NyARCoord2Linear(i_param.getScreenSize(), i_param.getDistortionFactor());
        this._deviation_data = new NyARMatchPattDeviationColorData(cw, ch);
        // Creating NyARMatchPatt_Color_WITHOUT_PCA of []
        this._match_patt = new Array(i_num_of_code);
        this._match_patt[0] = new NyARMatchPatt_Color_WITHOUT_PCA(i_ref_code[0]);
        for (var i = 1; i < i_num_of_code; i++) {
            // Resolution check
            if (cw != i_ref_code[i].getWidth() || ch != i_ref_code[i].getHeight()) {
                throw new NyARException();
            }
            this._match_patt[i] = new NyARMatchPatt_Color_WITHOUT_PCA(i_ref_code[i]);
        }
        return;
    },
    __tmp_vertex: NyARIntPoint2d.createArray(4)
    ,
    // is called each time the rectangle is found.
    // Inspect the rectangular pattern was found, to ensure the vertex data in consideration of the orientation.
    onSquareDetect: function(i_sender, i_coordx, i_coordy, i_coor_num, i_vertex_index) {
        var mr = this.__detectMarkerLite_mr;
        // Convert to vertex list from the contour coordinate
        var vertex = this.__tmp_vertex;
        vertex[0].x = i_coordx[i_vertex_index[0]];
        vertex[0].y = i_coordy[i_vertex_index[0]];
        vertex[1].x = i_coordx[i_vertex_index[1]];
        vertex[1].y = i_coordy[i_vertex_index[1]];
        vertex[2].x = i_coordx[i_vertex_index[2]];
        vertex[2].y = i_coordy[i_vertex_index[2]];
        vertex[3].x = i_coordx[i_vertex_index[3]];
        vertex[3].y = i_coordy[i_vertex_index[3]];

        if (!this._inst_patt.pickFromRaster(this._ref_raster, vertex)) { // Get the picture
            return;
        }
        // evaluated by converting the color difference data acquisition pattern.
        this._deviation_data.setRaster(this._inst_patt);
        // assign a pattern that matches the most.
        var square_index, direction;
        var confidence;
        this._match_patt[0].evaluate(this._deviation_data, mr);
        square_index = 0;
        direction = mr.direction;
        confidence = mr.confidence;
        // Second and subsequent
        var i;
        for (i = 1; i < this._match_patt.length; i++) {
            this._match_patt[i].evaluate(this._deviation_data, mr);
            if (confidence > mr.confidence) {
                continue;
            }
            // The dumping there was a marker that matches more
            square_index = i;
            direction = mr.direction;
            confidence = mr.confidence;
        }
        // recorded as information of this rectangle, the marker information that matches most.
        var result = this.result_stack.prePush();
        result.arcode_id = square_index;
        result.confidence = confidence;
        var sq = result.square;
        // In view of the direction, to update the square.
        for (i = 0; i < 4; i++) {
            var idx = (i + 4 - direction) % 4;
            this._coordline.coord2Line(i_vertex_index[idx], i_vertex_index[(idx + 1) % 4], i_coordx, i_coordy, i_coor_num, sq.line[i]);
        }
        for (i = 0; i < 4; i++) {
            if (!NyARLinear.crossPos(sq.line[i], sq.line[(i + 3) % 4], sq.sqvertex[i])) { //straight lines intersection
                throw new NyARException(); // if double buffer error, return here
            }
        }
    },
    init: function(i_raster) {
        this._ref_raster = i_raster;
        this.result_stack.clear();
    }
});

NyARSingleDetectMarker = ASKlass('NyARSingleDetectMarker', NyARCustomSingleDetectMarker, {// best marker match the ARCode from image
    PF_ARTOOLKIT_COMPATIBLE: 1,
    PF_NYARTOOLKIT: 2,
    PF_NYARTOOLKIT_ARTOOLKIT_FITTING: 100,
    PF_TEST2: 201
    ,
    // from camera parameters and ARCode to be detected, create a NyARSingleDetectMarker detect ARCode instance
    // @param i_param = camera parameters
    // @param i_code = ARCode to be detected
    // @param i_marker_width = physical size of the AR code (mm)
    // @param i_input_raster_type = input raster pixel type. getBufferType value of INyARBufferReader interface
    NyARSingleDetectMarker: function(i_param, i_code, i_marker_width, i_input_raster_type, i_profile_id) {
        if (i_profile_id == null)
            i_profile_id = this.PF_NYARTOOLKIT;
        NyARCustomSingleDetectMarker.initialize.call(this);
        this.initInstance2(i_param, i_code, i_marker_width, i_input_raster_type, i_profile_id);
        return;
    }
    ,
    initInstance2: function(i_ref_param, i_ref_code, i_marker_width, i_input_raster_type, i_profile_id) { //constructor function
        var th = new NyARRasterFilter_ARToolkitThreshold(100, i_input_raster_type);
        var patt_inst;
        var sqdetect_inst;
        var transmat_inst;
        switch (i_profile_id) {
            case this.PF_NYARTOOLKIT: //default
                patt_inst = new NyARColorPatt_Perspective_O2(i_ref_code.getWidth(), i_ref_code.getHeight(), 4, 25);
                sqdetect_inst = new NyARSquareContourDetector_Rle(i_ref_param.getScreenSize());
                transmat_inst = new NyARTransMat(i_ref_param);
                break;
            default:
                throw new NyARException();
        }
        NyARCustomSingleDetectMarker.initInstance.call(this, patt_inst, sqdetect_inst, transmat_inst, th, i_ref_param, i_ref_code, i_marker_width);
    }
    ,
    // Run the marker detection process i_image, and record the results.
    // @param i_raster = image marker detect: i_input_raster_type format with the screen size (image size in i_param)
    detectMarkerLite: function(i_raster, i_threshold) { // return if marker is detected
        (NyARRasterFilter_ARToolkitThreshold(this._tobin_filter)).setThreshold(i_threshold);
        return NyARCustomSingleDetectMarker.detectMarkerLiteB.call(this, i_raster);
    }
});

FLARDetectMarkerResult = ASKlass('FLARDetectMarkerResult', {
    arcode_id: 0,
    confidence: 0,
    direction: 0,
    square: new NyARSquare()
});

FLARDetectMarkerResultStack = ASKlass('FLARDetectMarkerResultStack', NyARObjectStack, {
    FLARDetectMarkerResultStack: function(i_length) {
        NyARObjectStack.initialize.call(this, i_length);
    },
    createArray: function(i_length) {
        var ret = new Array(i_length);
        for (var i = 0; i < i_length; i++) {
            ret[i] = new FLARDetectMarkerResult();
        }
        return (ret);
    }
});

// Class Search by AR code registered in the constructor, an AR code to detect multiple markers, best matches in each. 
// Approximately 100 is the limit to recognize up to 300, but as you might recognize the Gomiraberu.
FLARMultiMarkerDetector = ASKlass('FLARMultiMarkerDetector', {
    _detect_cb: null,
    AR_SQUARE_MAX: 300,
    _is_continue: false,
    _square_detect: null,
    _transmat: null,
    _offset: null,
    _flarcode: null, // import Phenomenon avoidance Decaying

    // Make the object to search from the i_code ARCode to detect a plurality of markers , the best match
    // @ Param i_param = camera parameters
    // @ Param i_code = ARCode array of markers to be detected
    // The index number of the array element will be the ARCode index obtained by getARCodeIndex function as it is
    // For example, if it is a marker that matches the ARCode element of [1], getARCodeIndex returns 1
    // @ Param i_marker_width = array specified in the millimeter size of the marker i_code. The elements of i_number_of_code individual from the beginning
    // @ Param i_number_of_code = included in the specified i_code, the number of ARCode

    FLARMultiMarkerDetector: function(i_param, i_code, i_marker_width, i_number_of_code) {
        this.initInstance(i_param, i_code, i_marker_width, i_number_of_code);
        return;
    },
    initInstance: function(i_ref_param, i_ref_code, i_marker_width, i_number_of_code) {

        var scr_size = i_ref_param.getScreenSize();
        // @todo: I put a check height and width, the ratio of the border marker of how to match all to this part. 
        // Or, it is possible to enter a number of the same forces when generating the FLARCode 
        // I create the analysis object
        var cw = i_ref_code[0].getWidth();
        var ch = i_ref_code[0].getHeight();
        // Percentage of the border (if the same as the standard ARToolKit, 25 - note the treatment of a number> 1.0 system is different!)
        var markerWidthByDec = (100 - i_ref_code[0].markerPercentWidth) / 2;
        var markerHeightByDec = (100 - i_ref_code[0].markerPercentHeight) / 2;
        // Create a holder of evaluation pattern 
        // Parameters of NyARColorPatt_Perspective_O2 
        // (The number of divisions when it was made ​​pat data) resolution of the first and second para ... vertical and horizontal 
        // Vertical and horizontal sampling number of third para ... 1 per pixel. I sample the 2x2 = 4 points if 2. 
        // Either 1, 2, 4, of any number. Concordance rate UP, frame rate decreases as the value is increased. 
        // Resolution 16, number 4 is the default sampling. If the resolution is high, it is possible to avoid a decrease in the frame rate by lowering the number of samples. 
        // (If the same as the standard ARToolKit, 25) percentage of fourth para ... edge width - note the handling of numeric> 1.0 system is different!
        var patt = new NyARColorPatt_Perspective_O2(cw, ch, 4, markerWidthByDec);
        // I can cope even if the ratio of the vertical and horizontal edge is different.
        patt.setEdgeSizeByPercent(markerWidthByDec, markerHeightByDec, 4);
        // trace('w:'+markerWidthByDec+'/h:'+markerHeightByDec);
        // callback function of detectMarker
        this._detect_cb = new MultiDetectSquareCB(patt, i_ref_code, i_number_of_code, i_ref_param);
        this._transmat = new NyARTransMat(i_ref_param);
        // NyARToolkit profile
        this._square_detect = new FLARSquareContourDetector(i_ref_param.getScreenSize());
        this._tobin_filter = new FLARRasterFilter_Threshold(100);
        //Actual size save
        this._offset = NyARRectOffset.createArray(i_number_of_code);
        for (var i = 0; i < i_number_of_code; i++) {
            this._offset[i].setSquare(i_marker_width[i]);
        }
        //I create a binary image buffer
        this._bin_raster = new FLARBinRaster(scr_size.w, scr_size.h);
        return;
    },
    _bin_raster: null,
    _tobin_filter: null,
    detectMarkerLite: function(i_raster, i_threshold) { // return number of markers found (i_image detection)
        // @ Param i_raster = image to detect the marker. 
        // @ Param i_thresh = detection threshold. range of 0-255. usually 100-130 . 

        if (!this._bin_raster.getSize().isEqualSize_NyARIntSize(i_raster.getSize())) { //Size check
            throw new NyARException();
        }
        // converted to a binary raster image.
        // SOC: threshold incoming image according to brightness.
        // passing -1 for threshold allows developers to apply custom thresholding algorithms
        // prior to passing source image to FLARToolkit.

        if (i_threshold != -1) { // apply FLARToolkit thresholding            
            (FLARRasterFilter_Threshold(this._tobin_filter)).setThreshold(i_threshold);
            this._tobin_filter.doFilter(i_raster, this._bin_raster);

        } else { // copy source BitmapData as-is            
            var srcBitmapData = (i_raster.getBuffer());
            var dstBitmapData = ((this._bin_raster).getBuffer());
            dstBitmapData.copyPixels(srcBitmapData, srcBitmapData.rect, new Point());
        }

        this._detect_cb.init(i_raster); //detect
        this._square_detect.detectMarkerCB(this._bin_raster, this._detect_cb);

        return this._detect_cb.result_stack.getLength(); //return found number
    },
    // Calculates the transformation matrix for the marker of i_index, and stores to o_result the result value. 
    // You can not use detectMarkerLite you ran just before has not been successful. 
    // @ Param i_index = index number of the marker. Must be greater than or equal to 0 and less than the return value of detectMarkerLite that ran just before. 
    // @ Param o_result = specify the object that receives the result value. 
    getTransformMatrix: function(i_index, o_result) {
        var result = this._detect_cb.result_stack.getItem(i_index);
        // Calculate the neighborhood such as the position of the marker that matches most
        if (_is_continue) {
            _transmat.transMatContinue(result.square, this._offset[result.arcode_id], o_result);
        } else {
            _transmat.transMat(result.square, this._offset[result.arcode_id], o_result);
        }
        return;
    },
    // @ Param i_index = index number of marker.
    getConfidence: function(i_index) {  // return coincidence degrees (0 to 1). lower = erroneous recognition 
        return this._detect_cb.result_stack.getItem(i_index).confidence;
    },
    // @ Param i_index = index number of the marker.
    getARCodeIndex: function(i_index) { // return index of ARCode marker of i_index.       
        return this._detect_cb.result_stack.getItem(i_index).arcode_id;
    },
    getDirection: function(i_index) { // return orientation of the marker detected (0,1,2,3)
        return this._detect_cb.result_stack.getItem(i_index).direction;
    },
    getSquare: function(i_index) { // Return one FLARSquare it detects or null. (Detection Dekinakattara null)
        return this._detect_cb.result_stack.getItem(i_index).square;
    },
    // @ Param i_is_continue = If TRUE, use the transMatContinue. If FALSE, use the transMat.
    setContinueMode: function(i_is_continue) { //set getTransmationMatrix calculation mode. 
        this._is_continue = i_is_continue;
    },
    // Inspected the size of the white area 
    // About 320px one side, the minimum size has been analyzed up to about 8px one side maximum size 
    // It is analyzed and, if it is within the above range in the analysis image, but a minimum size does not make sense to be too small. 
    // Reasonable to one side 30px ~ 230px is to determine the internal marker. 
    // If you are captured at 640x480, setting the square of the vertical size i_max. 
    // It should be noted, FLARLabeling.AR_AREA_MAX, FLARLabeling.AR_AREA_MIN is adapted If you specify 0. 

    //(The square of one side)
    // @ param i_max analyzed: 100000 (default maximum number of white pixel areas)
    // @ param i_min analyzed: 70 (default minimum number of white pixel areas)
    setAreaRange: function(i_max, i_min) {
        if (i_max == null)
            i_max = 100000;
        if (i_min == null)
            i_min = 70;
        if (i_max < 0) {
            i_max = FLARLabeling.AR_AREA_MAX;
        }
        if (i_min < 0) {
            i_min = FLARLabeling.AR_AREA_MIN;
        }
        if (i_max < i_min) {
            var tmp = i_max;
            i_max = i_min;
            i_min = tmp;
        }
        this._square_detect.setAreaRange(i_max, i_min);
    },
    thresholdedBitmapData: function() { //return binarized image information 
        try {
            return ((this._bin_raster).getBuffer());
        } catch (e) {
        }
        return null;
    }
});

FLARSingleMarkerDetector = ASKlass('FLARSingleMarkerDetector', {
    _is_continue: false,
    _square_detect: null,
    _transmat: null,
    _bin_raster: null, //Image processing
    _tobin_filter: null,
    _detect_cb: null,
    _offset: null,
    FLARSingleMarkerDetector: function(i_ref_param, i_ref_code, i_marker_width) {

        var th = new FLARRasterFilter_Threshold(100);
        var patt_inst;
        var sqdetect_inst;
        var transmat_inst;
        // Proportion of the border (if same as ARToolKit standard, 25 - note the handling of numeric> 1.0 system is different!)
        var markerWidthByDec = (100 - i_ref_code.markerPercentWidth) / 2;
        var markerHeightByDec = (100 - i_ref_code.markerPercentHeight) / 2;
        // Create a holder of evaluation pattern 
        // Parameters of NyARColorPatt_Perspective_O2 
        // (The number of divisions when it was made ​​pat data) resolution of the first and second para ... vertical and horizontal 
        // Vertical and horizontal sampling number of third para ... 1 per pixel. I sample the 2x2 = 4 points if 2. 
        // Either 1, 2, 4, of any number. Concordance rate UP, frame rate decreases as the value is increased. 
        // Resolution 16, number 4 is the default sampling. If the resolution is high, it is possible to avoid a decrease in the frame rate by lowering the number of samples. 
        // (If the same as the standard ARToolKit, 25) percentage of fourth para ... edge width - note the handling of numeric> 1.0 system is different!
        patt_inst = new NyARColorPatt_Perspective_O2(i_ref_code.getWidth(), i_ref_code.getHeight(), 4, markerWidthByDec);
        // I can cope even if the ratio of the vertical and horizontal edge is different.
        patt_inst.setEdgeSizeByPercent(markerWidthByDec, markerHeightByDec, 4);
        //trace('w:'+markerWidthByDec+'/h:'+markerHeightByDec);
        sqdetect_inst = new FLARSquareContourDetector(i_ref_param.getScreenSize());
        transmat_inst = new NyARTransMat(i_ref_param);
        this.initInstance(patt_inst, sqdetect_inst, transmat_inst, th, i_ref_param, i_ref_code, i_marker_width);
        return;
    },
    initInstance: function(i_patt_inst, i_sqdetect_inst, i_transmat_inst, i_filter, i_ref_param, i_ref_code, i_marker_width) {
        var scr_size = i_ref_param.getScreenSize();

        this._square_detect = i_sqdetect_inst; // I will make the analysis object
        this._transmat = i_transmat_inst;
        this._tobin_filter = i_filter;

        this._bin_raster = new FLARBinRaster(scr_size.w, scr_size.h); //I create a binary image buffer

        this._detect_cb = new SingleDetectSquareCB(i_patt_inst, i_ref_code, i_ref_param); //_detect_cb

        this._offset = new NyARRectOffset(); //Create offset
        this._offset.setSquare(i_marker_width);
        return;
    },
    // Run the marker detection process i_image, and record the results
    // @ Param i_raster = image to detect the marker. Image size, camera parameters    
    detectMarkerLite: function(i_raster, i_threshold) { // return if is detected

        FLARRasterFilter_Threshold(this._tobin_filter).setThreshold(i_threshold);
        if (!this._bin_raster.getSize().isEqualSize_NyARIntSize(i_raster.getSize())) { //Size check
            throw new FLARException();
        }

        this._tobin_filter.doFilter(i_raster, this._bin_raster); //I converted to a binary raster image.
        this._detect_cb.init(i_raster); //Preparing for callback handler
        //
        // Find the rectangle (the return value. Receive the callback function)
        this._square_detect.detectMarkerCB(this._bin_raster, this._detect_cb);
        if (this._detect_cb.confidence == 0) {
            return false;
        }
        return true;
    },
    // set transformation matrix of the detected markers to o_result. 
    // You cannot use detectMarkerLite. ran just before has not been successful. 
    // @ Param o_result = transformation matrix object
    getTransformMatrix: function(o_result) {

        if (this._is_continue) { //Calculate the neighborhood such as the position of the marker that matches most
            this._transmat.transMatContinue(this._detect_cb.square, this._offset, o_result);
        } else {
            this._transmat.transMat(this._detect_cb.square, this._offset, o_result);
        }
        return;
    },
    getConfidence: function() { // return coincidence degrees (0 to 1). lower = erroneous recognition
        return this._detect_cb.confidence;
    },
    getDirection: function() {  // return orientation of the marker detected (0,1,2,3)
        return this._detect_cb.direction;
    },
    getSquare: function() { //Return one FLARSquare it detects or null. (Detection Dekinakattara null)
        return this._detect_cb.square;
    },
    // @ Param i_is_continue = If TRUE, use the transMatContinue. If FALSE, use the transMat.
    setContinueMode: function(i_is_continue) { //set getTransmationMatrix calculation mode. 
        this._is_continue = i_is_continue;
    },
    // Inspected the size of the white area 
    // About 320px one side, the minimum size has been analyzed up to about 8px one side maximum size 
    // It is analyzed and, if it is within the above range in the analysis image, but a minimum size does not make sense to be too small. 
    // Reasonable to one side 30px ~ 230px is to determine the internal marker. 
    // If you are captured at 640x480, setting the square of the vertical size i_max. 
    // It should be noted, FLARLabeling.AR_AREA_MAX, FLARLabeling.AR_AREA_MIN is adapted If you specify 0. 

    //(The square of one side)
    // @ param i_max analyzed: 100000 (default maximum number of white pixel areas)
    // @ param i_min analyzed: 70 (default minimum number of white pixel areas)
    setAreaRange: function(i_max, i_min) {
        if (i_max == null)
            i_max = 100000;
        if (i_min == null)
            i_min = 70;
        if (i_max < 0) {
            i_max = FLARLabeling.AR_AREA_MAX;
        }
        if (i_min < 0) {
            i_min = FLARLabeling.AR_AREA_MIN;
        }
        if (i_max < i_min) {
            var tmp = i_max;
            i_max = i_min;
            i_min = tmp;
        }
        this._square_detect.setAreaRange(i_max, i_min);
    },
    thresholdedBitmapData: function() { //return binarized image information 
        try {
            return ((this._bin_raster).getBuffer());
        } catch (e) {
        }
        return null;
    }
});

MultiDetectSquareCB = ASKlass('MultiDetectSquareCB', { //Callback function detectMarker

    result_stack: new FLARDetectMarkerResultStack(NyARDetectMarker.AR_SQUARE_MAX), //Public properties    
    _ref_raster: null, //Reference instance    
    _inst_patt: null, //Owning instance
    _deviation_data: null,
    _match_patt: null,
    __detectMarkerLite_mr: new NyARMatchPattResult(),
    _coordline: null,
    MultiDetectSquareCB: function(i_inst_patt, i_ref_code, i_num_of_code, i_param) {

        var cw = i_ref_code[0].getWidth();
        var ch = i_ref_code[0].getHeight();
        this._inst_patt = i_inst_patt;
        this._coordline = new NyARCoord2Linear(i_param.getScreenSize(), i_param.getDistortionFactor());
        this._deviation_data = new NyARMatchPattDeviationColorData(cw, ch);
        this._match_patt = new Array(i_num_of_code); //NyARMatchPatt_Color_WITHOUT_PCA
        this._match_patt[0] = new NyARMatchPatt_Color_WITHOUT_PCA(i_ref_code[0]);
        for (var i = 1; i < i_num_of_code; i++) {

            if (cw != i_ref_code[i].getWidth() || ch != i_ref_code[i].getHeight()) { //Resolution check
                throw new NyARException();
            }
            this._match_patt[i] = new NyARMatchPatt_Color_WITHOUT_PCA(i_ref_code[i]);
        }
        return;
    },
    __tmp_vertex: NyARIntPoint2d.createArray(4),
    onSquareDetect: function(i_sender, i_coordx, i_coordy, i_coor_num, i_vertex_index) { //ensure pattern vertex data with the orientation

        var mr = this.__detectMarkerLite_mr;

        //Convert to vertex list from the contour coordinate
        var vertex = this.__tmp_vertex;
        vertex[0].x = i_coordx[i_vertex_index[0]];
        vertex[0].y = i_coordy[i_vertex_index[0]];
        vertex[1].x = i_coordx[i_vertex_index[1]];
        vertex[1].y = i_coordy[i_vertex_index[1]];
        vertex[2].x = i_coordx[i_vertex_index[2]];
        vertex[2].y = i_coordy[i_vertex_index[2]];
        vertex[3].x = i_coordx[i_vertex_index[3]];
        vertex[3].y = i_coordy[i_vertex_index[3]];

        if (!this._inst_patt.pickFromRaster(this._ref_raster, vertex)) { // Get the picture
            return;
        }

        this._deviation_data.setRaster(this._inst_patt); //Is evaluated by converting the color difference data acquisition pattern.

        var square_index, direction; // assign a pattern that matches the most.
        var confidence;
        this._match_patt[0].evaluate(this._deviation_data, mr);
        square_index = 0;
        direction = mr.direction;
        confidence = mr.confidence;

        //Second and subsequent
        var i;
        for (i = 1; i < this._match_patt.length; i++) {
            this._match_patt[i].evaluate(this._deviation_data, mr);
            if (confidence > mr.confidence) {
                continue;
            }
            // The dumping there was a marker that matches more
            square_index = i;
            direction = mr.direction;
            confidence = mr.confidence;
        }
        // recorded as information of this rectangle, the marker information that matches most
        var result = this.result_stack.prePush();
        result.arcode_id = square_index;
        result.confidence = confidence;
        result.direction = direction;
        var sq = result.square;
        // In view of the direction, to update the square
        for (i = 0; i < 4; i++) {
            var idx = (i + 4 - direction) % 4;
            this._coordline.coord2Line(i_vertex_index[idx], i_vertex_index[(idx + 1) % 4], i_coordx, i_coordy, i_coor_num, sq.line[i]);
        }
        for (i = 0; i < 4; i++) {
            // Intersection calculation of straight lines
            if (!NyARLinear.crossPos(sq.line[i], sq.line[(i + 3) % 4], sq.sqvertex[i])) {
                throw new NyARException();// OK if the double buffer if an error return here
            }
        }
    },
    init: function(i_raster) {
        this._ref_raster = i_raster;
        this.result_stack.clear();
    }
});

SingleDetectSquareCB = ASKlass('SingleDetectSquareCB', {// callback function of detectMarker
    //Public properties
    confidence: 0,
    square: new NyARSquare(),
    direction: 0,
    //Reference instance
    _ref_raster: null,
    //Owning instance
    _inst_patt: null,
    _deviation_data: null,
    _match_patt: null,
    __detectMarkerLite_mr: new NyARMatchPattResult(),
    _coordline: null,
    SingleDetectSquareCB: function(i_inst_patt, i_ref_code, i_param) {

        this._inst_patt = i_inst_patt;
        this._deviation_data = new NyARMatchPattDeviationColorData(i_ref_code.getWidth(), i_ref_code.getHeight());
        this._coordline = new NyARCoord2Linear(i_param.getScreenSize(), i_param.getDistortionFactor());
        this._match_patt = new NyARMatchPatt_Color_WITHOUT_PCA(i_ref_code);
        return;
    },
    __tmp_vertex: NyARIntPoint2d.createArray(4),
    onSquareDetect: function(i_sender, i_coordx, i_coordy, i_coor_num, i_vertex_index) { //ensure pattern vertex data with the orientation

        var i;
        var mr = this.__detectMarkerLite_mr;
        //Convert to vertex list from the contour coordinate
        var vertex = this.__tmp_vertex;
        vertex[0].x = i_coordx[i_vertex_index[0]];
        vertex[0].y = i_coordy[i_vertex_index[0]];
        vertex[1].x = i_coordx[i_vertex_index[1]];
        vertex[1].y = i_coordy[i_vertex_index[1]];
        vertex[2].x = i_coordx[i_vertex_index[2]];
        vertex[2].y = i_coordy[i_vertex_index[2]];
        vertex[3].x = i_coordx[i_vertex_index[3]];
        vertex[3].y = i_coordy[i_vertex_index[3]];
        //Get the picture
        if (!this._inst_patt.pickFromRaster(this._ref_raster, vertex)) {
            return;
        }
        //Is evaluated by converting the color difference data acquisition pattern
        this._deviation_data.setRaster(this._inst_patt);
        if (!this._match_patt.evaluate(this._deviation_data, mr)) {
            return;
        }
        //Exit is lower than the current rate of match
        if (this.confidence > mr.confidence) {
            return;
        }
        //If there is a square having a high matching rate, to create a vertex information in consideration of the orientation
        var sq = this.square;
        this.confidence = mr.confidence;
        this.direction = mr.direction;
        //In view of the direction, to update the square.
        for (i = 0; i < 4; i++) {
            var idx = (i + 4 - mr.direction) % 4;
            this._coordline.coord2Line(i_vertex_index[idx], i_vertex_index[(idx + 1) % 4], i_coordx, i_coordy, i_coor_num, sq.line[i]);
        }
        for (i = 0; i < 4; i++) {
            //Full straight intersection calculation with disabilities
            if (!NyARLinear.crossPos(sq.line[i], sq.line[(i + 3) % 4], sq.sqvertex[i])) {
                throw new NyARException(); //OK if the double buffer if an error return here
            }
        }
    },
    init: function(i_raster) {
        this.confidence = 0;
        this._ref_raster = i_raster;
    }
});

FLARIdMarkerData = ASKlass('FLARIdMarkerData', {
    _packet: new IntVector(22), // express Vector packet data. (Maximum number of packets: 21 + (1) in the model 7
    _model: 0,
    _controlDomain: 0,
    _controlMask: 0,
    _check: 0,
    _dataDot: 0,
    packetLength: 0,
    FLARIdMarkerData: function() {
    }
    ,
    isEqual: function(i_target) {
        if (i_target == null || !(i_target instanceof FLARIdMarkerData)) {
            return false;
        }
        var s = i_target;
        if (s.packetLength != this.packetLength ||
                s._check != this._check ||
                s._controlDomain != this._controlDomain ||
                s._controlMask != this._controlMask ||
                s._dataDot != this._dataDot ||
                s._model != this._model) {
            return false;
        }
        for (var i = s.packetLength - 1; i >= 0; i--) {
            if (s._packet[i] != this._packet[i]) {
                return false;
            }
        }
        return true;
    }
    ,
    copyFrom: function(i_source) {
        var s = i_source;
        if (s == null)
            return;
        this._check = s._check;
        this._controlDomain = s._controlDomain;
        this._controlMask = s._controlMask;
        this._dataDot = s._dataDot;
        this._model = s._model;
        this.packetLength = s.packetLength;
        for (var i = s.packetLength - 1; i >= 0; i--) {
            this._packet[i] = s._packet[i];
        }
        return;
    },
    ////////////////////////////////////////////////////////////////////////////
    // SETTERS
    setModel: function(value) {
        this._model = value;
    },
    setControlDomain: function(value) {
        this._controlDomain = value;
    },
    setControlMask: function(value) {
        this._controlMask = value;
    },
    setCheck: function(value) {
        this._check = value;
    },
    setPacketData: function(index, data) {
        if (index < this.packetLength) {
            this._packet[index] = data;
        } else {
            throw ("packet index over " + index + " >= " + this.packetLength);
        }
    },
    setDataDotLength: function(value) {
        this._dataDot = value;
    },
    setPacketLength: function(value) {
        this.packetLength = value;
    },
    ////////////////////////////////////////////////////////////////////////////
    // GETTERS
    dataDotLength: function() {
        return this._dataDot;
    }, model: function() {
        return this._model;
    },
    controlDomain: function() {
        return this._controlDomain;
    },
    controlMask: function() {
        return this._controlMask;
    },
    check: function() {
        return this._check;
    },
    getPacketData: function(index) {
        if (this.packetLength <= index)
            throw new ArgumentError("packet index over");
        return this._packet[index];
    }
});

FLARDetectIdMarkerResult = ASKlass('FLARDetectIdMarkerResult', {
    arcode_id: 0,
    direction: 0,
    markerdata: new FLARIdMarkerData(),
    square: new NyARSquare()
});

FLARDetectIdMarkerResultStack = ASKlass('FLARDetectIdMarkerResultStack', NyARObjectStack, {
    FLARDetectIdMarkerResultStack: function(i_length) {
        NyARObjectStack.initialize.call(this, i_length);
    },
    createArray: function(i_length) {
        var ret = new Array(i_length);
        for (var i = 0; i < i_length; i++) {
            ret[i] = new FLARDetectIdMarkerResult();
        }
        return (ret);
    }
});

FLARMultiIdMarkerDetectCB = ASKlass('FLARMultiIdMarkerDetectCB', {// callback function of detectMarker DEFAULT3
    // Public properties
    result_stack: new FLARDetectIdMarkerResultStack(NyARDetectMarker.AR_SQUARE_MAX),
    square: new FLARSquare(),
    marker_data: null,
    threshold: 0,
    direction: 0,
    _ref_raster: null,
    _current_data: null,
    _data_temp: null,
    _prev_data: null,
    _id_pickup: new NyIdMarkerPickup(),
    _coordline: null,
    _encoder: null,
    __tmp_vertex: NyARIntPoint2d.createArray(4),
    _marker_param: new NyIdMarkerParam(),
    _maker_pattern: new NyIdMarkerPattern()
    ,
    FLARMultiIdMarkerDetectCB: function(i_param, i_encoder) {
        this._coordline = new NyARCoord2Linear(i_param.getScreenSize(), i_param.getDistortionFactor());
        this._data_temp = i_encoder.createDataInstance();
        this._current_data = i_encoder.createDataInstance();
        this._encoder = i_encoder;
        return;
    }
    ,
    init: function(i_raster) { // Initialize call back handler.
        this.marker_data = null;
        this.result_stack.clear();
        this._id_pickup.init();
        this._ref_raster = i_raster;
    },
    _previous_verts: {}
    ,
    onSquareDetect: function(i_sender, i_coordx, i_coordy, i_coor_num, i_vertex_index) { //ensure pattern vertex data with the orientation

        // Convert to vertex list from the contour coordinate
        var vertex = this.__tmp_vertex;
        vertex[0].x = i_coordx[i_vertex_index[0]];
        vertex[0].y = i_coordy[i_vertex_index[0]];
        vertex[1].x = i_coordx[i_vertex_index[1]];
        vertex[1].y = i_coordy[i_vertex_index[1]];
        vertex[2].x = i_coordx[i_vertex_index[2]];
        vertex[2].y = i_coordy[i_vertex_index[2]];
        vertex[3].x = i_coordx[i_vertex_index[3]];
        vertex[3].y = i_coordy[i_vertex_index[3]];
        var param = this._marker_param;
        var patt_data = this._maker_pattern;
        // I cut out from the image a pattern of the evaluation criteria
        var cv;
        if (window.DEBUG) {
            cv = document.getElementById('debugCanvas').getContext('2d');
            cv.fillStyle = 'blue';
            for (var i = 0; i < 4; i++) {
                cv.fillRect(vertex[i].x - 2, vertex[i].y - 2, 5, 5); //cinco
            }
        }
        var cx = 0, cy = 0;
        for (var i = 0; i < 4; i++) {
            cx += vertex[i].x;
            cy += vertex[i].y;
        }
        cx /= 4;
        cy /= 4;

        var pick = this._id_pickup.pickFromRaster(this._ref_raster, vertex, patt_data, param);

        if (!pick) {
            if (window.DEBUG) {
                cv.fillStyle = '#ff0000';
                cv.fillText('No pick', cx + 3, cy);
            }
            return;
        }

        var enc = this._encoder.encode(patt_data, this._data_temp); //Encode
        if (!enc) {
            return;
        }
        this._current_data.copyFrom(this._data_temp);
        this.marker_data = this._current_data; //found
        this.threshold = param.threshold;
        this.direction = param.direction;

        // record the marker information.
        var result = this.result_stack.prePush();
        result.direction = this.direction;
        result.markerdata.copyFrom(this.marker_data);
        result.arcode_id = this.getId(result.markerdata);
        if (window.DEBUG) {
            cv.fillStyle = '#00ffff';
            cv.fillText(result.arcode_id, cx + 3, cy);
        }
        // Only when there is an update in the ongoing recognition or recognition, new, I want to update the information Square
        // Above is executed only under this condition from here
        var sq = result.square;
        // In view of the direction, to update the square
        var i;
        for (i = 0; i < 4; i++) {
            var idx = (i + 4 - param.direction) % 4;
            this._coordline.coord2Line(i_vertex_index[idx], i_vertex_index[(idx + 1) % 4], i_coordx, i_coordy, i_coor_num, sq.line[i]);
        }
        for (i = 0; i < 4; i++) {
            // Full straight intersection calculation with disabilities
            if (!NyARLinear.crossPos(sq.line[i], sq.line[(i + 3) % 4], sq.sqvertex[i])) {
                throw new NyARException(); // OK if the double buffer if an error return here
            }
        }
    }
    ,
    getId: function(data) {
        var currId;
        if (data.packetLength > 4) {
            currId = -1;
        } else {
            currId = 0;
            for (var i = 0; i < data.packetLength; i++) { // convert to value of one by connecting up to four bytes
                currId = (currId << 8) | data.getPacketData(i);
            }
        }
        return currId;
    }
});

FLARMultiIdMarkerDetector = ASKlass('FLARMultiIdMarkerDetector', {//DEFAULT1
    _is_continue: false,
    _square_detect: null,
    _offset: null,
    _current_threshold: 110,
    _bin_raster: null, // [AR] Detectable Full save with results
    _tobin_filter: null,
    _callback: null,
    _data_current: null,
    _threshold_detect: null,
    _transmat: null
    ,
    FLARMultiIdMarkerDetector: function(i_param, i_marker_width) {
        var scr_size = i_param.getScreenSize();
        var encoder = new FLARIdMarkerDataEncoder_RawBit();
        // make the analysis object
        this._square_detect = new FLARSquareContourDetector(scr_size);
        this._callback = new FLARMultiIdMarkerDetectCB(i_param, encoder);
        this._transmat = new NyARTransMat(i_param);
        // create a binary image buffer
        this._bin_raster = new FLARBinRaster(scr_size.w, scr_size.h);
        // make two data objects for work
        this._data_current = encoder.createDataInstance();
        this._tobin_filter = new FLARRasterFilter_Threshold(110);
        this._threshold_detect = new FLARRasterThresholdAnalyzer_SlidePTile(15, 4);
        this._offset = new NyARRectOffset();
        this._offset.setSquare(i_marker_width);
        return;
    },
    detectMarkerLite: function(i_raster, i_threshold) {
        // Size check
        if (!this._bin_raster.getSize().isEqualSize_int(i_raster.getSize().w, i_raster.getSize().h)) {
            throw new FLARException();
        }
        // I converted to a binary raster image
        this._tobin_filter.setThreshold(i_threshold);
        this._tobin_filter.doFilter(i_raster, this._bin_raster);
        // find new marker or markers, specified in the second argument) to find the square code
        this._callback.init(this._bin_raster);
        this._square_detect.detectMarkerCB(this._bin_raster, this._callback);
        //I return the number found
        return this._callback.result_stack.getLength();
    }
    ,
    // Calculates the transformation matrix for the marker of i_index, and stores to o_result the result value. You can not use detectMarkerLite you ran just before has not been successful. 

    // @ Param i_index = index number of the marker. Must be greater than or equal to 0 and less than the return value of detectMarkerLite that ran just before. 
    // @ Param o_result = object that receives the result value. 
    getTransformMatrix: function(i_index, o_result) {

        var result = this._callback.result_stack.getItem(i_index);
        // Calculate the neighborhood such as the position of the marker that matches most
        if (this._is_continue) {
            this._transmat.transMatContinue(result.square, this._offset, o_result);
        } else {
            this._transmat.transMat(result.square, this._offset, o_result);
        }
        return;
    }
    ,
    getIdMarkerData: function(i_index) {
        var result = new FLARIdMarkerData();
        result.copyFrom(this._callback.result_stack.getItem(i_index).markerdata);
        return result;
    }
    ,
    // return the index of ARCode marker of i_index. 
    // @ Param i_index = index number of the marker. Must be greater than or equal to 0 and less than the return value of detectMarkerLite that ran just before.   
    getARCodeIndex: function(i_index) {
        return this._callback.result_stack.getItem(i_index).arcode_id;
    }
    ,
    getDirection: function(i_index) { // return the orientation of the marker detected (0,1,2,3)
        return this._callback.result_stack.getItem(i_index).direction;
    }
    ,
    getSquare: function(i_index) { // Returns one FLARSquare it detects. Detection Dekinakattara null.    
        return this._callback.result_stack.getItem(i_index).square;
    }
    ,
    // I set the calculation mode of getTransmationMatrix.
    // If it is TRUE, then use the transMatContinue. If it is FALSE, then use the transMat.
    setContinueMode: function(i_is_continue) {
        this._is_continue = i_is_continue;
    }
    ,
    thresholdedBitmapData: function() { // returns the binarized image.
        try {
            return ((this._bin_raster).getBuffer());
        } catch (e) {
            return null;
        }
        return null;
    }
});

FLARIdMarkerDataEncoder_RawBit = ASKlass('FLARIdMarkerDataEncoder_RawBit', {
    _DOMAIN_ID: 0,
    _mod_data: new IntVector([7, 31, 127, 511, 2047, 4095]), // Value to use for the control of mod dot creation
    encode: function(i_data, o_dest) {

        var dest = o_dest;
        if (dest == null) {
            throw new FLARException("type of o_dest must be \"FLARIdMarkerData\"");
        }
        if (i_data.ctrl_domain != this._DOMAIN_ID) {
            return false;
        }
        dest.setCheck(i_data.check);
        dest.setControlDomain(i_data.ctrl_domain);
        dest.setControlMask(i_data.ctrl_mask);
        dest.setModel(i_data.model);
        // Data number of dots calculation
        var resolution_len = toInt(i_data.model * 2 - 1); //trace("resolution", resolution_len);
        dest.setDataDotLength(resolution_len);
        // Data the number of dots, "(2 * model value - 1) ^ 2" in resolution_len next, the value is the source of this square,
        // and packet count is "(data number of dots / 8) + 1" (1 plus the last packet 0) 
        var packet_length = toInt((resolution_len * resolution_len) / 8) + 1;
        // trace("packet", packet_length);
        dest.setPacketLength(packet_length);
        var sum = 0;
        for (var i = 0; i < packet_length; i++) {
            dest.setPacketData(i, i_data.data[i]);
            // trace("i_data[",i,"]",i_data.data[i]);
            sum += i_data.data[i];
        }
        // Check dot value calculation
        sum = sum % this._mod_data[i_data.model - 2];
        // trace("check dot", i_data.check, sum);
        // Check dot comparison
        if (i_data.check != sum) {
            return false;
        }
        return true;
    },
    createDataInstance: function() {
        return new FLARIdMarkerData();
    }
});
