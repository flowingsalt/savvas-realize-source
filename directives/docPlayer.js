angular.module('RealizeDirectives')
    .directive('docPlayer', [
        '$log',
        '$rootScope',
        '$http',
        'RealizeHelpers',
        'Messages',
        'BrowserInfo',
        function($log, $rootScope, $http, helpers, Messages, BrowserInfo) {
            'use strict';

            return {
                scope: {
                    pages: '=docPlayer',
                    docType: '=',
                    pageNum: '=page',
                    docViewerUrl: '=',
                    showToolsPreviewer: '=',
                    scrollSpeed: '@',
                    offsetX: '@',
                    offsetY: '@' // for ex on the content viewer we need to account for the header
                },
                template: [
                    '<div class="doc-preview flexColumnGrow" style="overflow:auto;" ',
                        'tabindex="0">',
                        '<div class="flexColumnGrow bkgWhileIframeLoads">',
                            '<iframe ng-src="{{ docViewerUrl }}" title="{{ iframeTitle }}" ',
                            'class="doc-pdf-viewer flexColumnGrow" allowfullscreen webkitallowfullscreen ',
                            'msallowfullscreen reset-google-doc-viewer></iframe>',
                        '</div>',
                    '</div>'
                ].join(''),
                link: function(scope, el, attrs) {
                    var scrollEvent = {page: 1, changed: false};
                    scope.pageUrls = [];
                    scope.noDocumentPreviewMessage = Messages.getMessage('contentViewer.docPreview.noPreview');
                    scope.imagePreviewMessage = Messages.getMessage('contentViewer.docPreview.imagePreviewA11y');
                    // each "page" is an item in the "previews" array
                    scope.setPageUrl = function(page, index) {
                        // need to use special url for ipad
                        if (BrowserInfo.isIDevice && page.ipadUrl && page.ipadTokenRetrievalUrl) {
                            $rootScope.currentUser.$getIpadPreview(page, function(url) {
                                scope.pageUrls[index] = url;
                            });
                        } else {
                            scope.pageUrls[index] = page.url;
                        }
                    };

                    scope.$on('scrollSpy.docPlayerPages', function(e, spies) {
                        var scrolledPage = 0.75 * $('.doc-preview-page').height();
                        var index = _.reject(spies, function(spy) {
                            return (spy.top > scrolledPage);
                        });

                        if (scrollEvent.page !== index.length) {
                            scrollEvent.page = index.length;
                            scrollEvent.changed = true;
                            helpers.updateParentScopeValue(scope, attrs.page, index.length);
                        }
                    });

                    if (scope.showToolsPreviewer) {
                        scope.iframeTitle = 'Tool Panel Document Viewer';
                    } else {
                        scope.iframeTitle = 'Document Content Viewer';
                    }

                    scope.$watch('pageNum', function(page, old) {
                        $log.log('pageNum watch', page, old);

                        if (scrollEvent.page !== page) {
                            // validating the values which are entered
                            page = page > scope.pages.length ? scope.pages.length : page < 1 ? 1 : page;
                            scrollEvent.page = parseInt(page, 10);
                        }
                        angular.element('#docCurrentPage')[0].value = page;

                        if (scrollEvent.changed) {
                            scrollEvent.changed = false;
                            return;
                        }
                        if (!angular.isDefined(scope.offsetX) || scope.offsetX === '') {
                            scope.offsetX = 0;
                        }
                        if (!angular.isDefined(scope.offsetY) || scope.offsetY === '') {
                            scope.offsetY = 0;
                        }
                        if (!angular.isDefined(scope.scrollSpeed) || scope.scrollSpeed === '') {
                            scope.scrollSpeed = 0;
                        }

                        scope.offsetX = parseInt(scope.offsetX, 10);
                        scope.offsetY = parseInt(scope.offsetY, 10);
                        scope.scrollSpeed = parseInt(scope.scrollSpeed, 10);

                        if (!angular.isDefined(page) || page === '') {
                            // this is likely when using backspace to change the number
                            return;
                        }

                        angular.element('.doc-preview').scrollTo('img[data-page=' + page + ']', scope.scrollSpeed, {
                            offset: {left: scope.offsetX, top: scope.offsetY}
                        });
                    });

                }
            };
        }
    ]);
