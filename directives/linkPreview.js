angular.module('RealizeDirectives')
    .directive('linkPreview', [
        '$log',
        '$rootScope',
        '$window',
        'BrowserInfo',
        function($log, $rootScope, $window, BrowserInfo) {
            'use strict';

            return {
                scope: {
                    link: '=',
                    linkText: '@',
                    isAdaptive: '='
                },
                replace: true,
                template: [
                        '<div class="content-body link">',
                            '<div class="container new-window">',
                                '<div class="table-wrapper">',
                                    '<img id="previewBox" alt="" />',
                                    '<a class="details" id="newWindowLink" href="{{ url }}" target="_blank" ',
                                    'event-interceptor="linkClickHandler()">',
                                        '<div class="button-wrapper">',
                                           '<div class="click-text">{{ linkText }}</div>',
                                           '<div class="click-button"><i class="icon-arrow-right" /></div>',
                                        '</div>',
                                    '</a>',
                                '</div>',
                            '</div>',
                        '</div>'
                    ].join(''),
                controller: ['$scope', function($scope) {
                    var loadPreview,
                        imageHasLoaded,
                        imageLoaded,
                        imageLoadSuccess,
                        imageLoadError,
                        initPreview,
                        calcSpace,
                        jqWindow = angular.element($window),
                        $contentBody = $('.content-body.link'),
                        $contentLinkButton = $('.content-body.link .button-wrapper'),
                        eventNamespace = '.linkPreview';
                    $scope.url = $scope.link.$getUrl();

                    //Set preview
                    loadPreview = angular.element(document.createElement('img'));
                    loadPreview.attr('id', 'previewBox');

                    // post-image load processing
                    imageHasLoaded = false;
                    imageLoaded = function(success) {
                        if (!imageHasLoaded) {
                            imageHasLoaded = true;
                            if (success) {
                                $('#previewBox').replaceWith(loadPreview);
                                $('#pageWrap').removeClass('mediaType-link');
                            } else {
                                $('#previewBox').remove();
                            }
                        }
                    };
                    imageLoadSuccess = function() {
                        imageLoaded(true);
                    };
                    imageLoadError = function() {
                        imageLoaded(false);
                    };

                    //Fallback
                    loadPreview.on('error' + eventNamespace, imageLoadError);
                    loadPreview.on('load' + eventNamespace, imageLoadSuccess);

                    initPreview = function(url) {
                        loadPreview.attr('src', url);

                        setTimeout(function() {
                            if (loadPreview.context.width === 0) { //image not loaded after 5 seconds
                                imageLoaded(false);
                            }
                        }, 5000);
                    };
                    // Previews array is not available
                    if (!$scope.link.previews || $scope.link.previews.length === 0) {
                        imageLoaded(false);
                    } else {
                        var preview = $scope.link.previews[0];

                        if (BrowserInfo.isIDevice && preview.ipadTokenRetrievalUrl && preview.ipadUrl) {
                            $rootScope.currentUser.$getIpadPreview(preview, function(url) {
                                initPreview(url);
                            });
                        } else {
                            initPreview(preview.url);
                        }
                    }

                    calcSpace = function() {
                        if ($scope.isAdaptive) {
                            //align external link button center for adaptive assignment
                            // 100 is for top and bottom bar, 77 is half of link buttton height and its padding
                            $contentLinkButton.css({
                                'margin-top':  (jqWindow.height() - 100) / 2 - 77
                            });
                        }
                    };

                    calcSpace();

                    jqWindow.on('resize', calcSpace);

                    $scope.$on('$destroy', function() {
                        loadPreview.off(eventNamespace);
                        jqWindow.off('resize', calcSpace);
                        $contentBody.css({ width: 'initial' });
                    });

                    $scope.linkClickHandler = function() {
                        $scope.$parent.warningModalHandler($scope.url);
                    };
                }]
            };
        }
    ]);
