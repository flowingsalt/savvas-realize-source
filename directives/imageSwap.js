angular.module('Realize.imgUtils.imgSwap', [])
    .directive('imageSwap', ['$log',
        /**
         * Simple mechanism for showing a default image, and then replacing it
         *      with a different image once the new image is loaded.
         * i.e. Situation where a placeholder image is cached, but the "real" image takes a few seconds to download
         * Should really only be used with images, but no restriction on this.
         */
        function imageSwapDirective($log) {
        'use strict';

        return function link(scope, element, attrs) {
            var newSrc;

            attrs.$observe('imageSwap', function srcChanged() {
                newSrc = attrs.imageSwap;

                if (newSrc) {
                    var fakeImg = document.createElement('IMG');
                    fakeImg.addEventListener('load', swapImgLoaded);
                    fakeImg.addEventListener('error', swapImgError);
                    fakeImg.src = newSrc;
                }
            });

            //Now that the image is loaded,
            //  just going to swap out the current element's src attr for the newly loaded src
            function swapImgLoaded() {
                element.get(0).src = newSrc;
            }

            //Log any error so we can be aware of broken links, etc...
            function swapImgError() {
                $log.error('Swap-Image Error: ', {defaultSrc: element.get(0).src, swapSrc: newSrc});
            }
        };

    }]);
