angular.module('Realize.filters.fileSize', [])
    .filter('fileSize', function() {
        'use strict';

        // these methods adapted to angular from OLE's util.js
        var numFormat = function(number, decimals, decPoint, thousandsSep) {
            number = number.toString().replace(',', '').replace(' ', '');

            var n = !isFinite(+number) ? 0 : +number,
                prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
                sep = thousandsSep ? ',' : thousandsSep,
                dec = decPoint ? '.' : decPoint,
                s = '',
                toFixedFix = function(n, prec) {
                    var k = Math.pow(10, prec);
                    return (Math.round(n * k) / k).toString();
                };

            // Fix for IE parseFloat(0.55).toFixed(0) = 0;
            s = (prec ? toFixedFix(n, prec) : Math.round(n).toString()).split('.');
            if (s[0].length > 3) {
                s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
            }

            if ((s[1] || '').length < prec) {
                s[1] = s[1] || '';
                while (s[1].length < prec) {
                    s[1] += '0';
                }
            }

            return s.join(dec);
        };

        return function(input) {
            var filesize;

            if (!input) {
                return 'N/A';
            }

            var gb = 1073741824,
                mb = 1048576,
                kb = 1024;

            if (input >= gb) {
                filesize = numFormat(input / gb, 2, '.', '') + ' GB';
            } else {
                if (input >= mb) {
                    filesize = numFormat(input / mb, 2, '.', '') + ' MB';
                } else {
                    if (input >= kb) {
                        filesize = numFormat(input / kb, 0) + ' KB';
                    } else {
                        filesize = numFormat(input, 0) + ' bytes';
                    }
                }
            }

            return filesize;
        };
    });
