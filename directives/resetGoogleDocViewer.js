angular.module('RealizeDirectives')
    .directive('resetGoogleDocViewer', [
        'GOOGLE_DOCS_VIEWER_URL',
        function(GOOGLE_DOCS_VIEWER_URL) {
            'use strict';

            return {
                link: function(scope, element, attrs) {
                    var timer,
                        interval = 1500,
                        shouldReset = true,
                        docViewerUrl = attrs.ngSrc;

                    var setIntervalAndCheckGoogleDocViewer = function(docViewerUrl) {
                        // At set interval, check if Google Doc Viewer Iframe is loaded
                        timer = setInterval(function() {
                            var docViewerIFrame = element[0];
                            checkIFrame(docViewerIFrame);
                            if (shouldReset) {
                                // Reset the iframe again
                                docViewerIFrame.src = docViewerUrl;
                            }
                        }, interval, docViewerUrl);
                    };

                    var checkIFrame = function(docViewerIFrame) {
                        try {
                            // If this throws a CORS error, iframe has successfully loaded
                            /* jshint unused:false */
                            var docViewerIFrameContent = (docViewerIFrame.contentDocument ||
                                docViewerIFrame.contentWindow.document);
                        } catch (err) {
                            // Clear Interval after iframe loads successfully
                            shouldReset = false;
                            clearInterval(timer);
                        }
                    };

                    if (docViewerUrl.startsWith(GOOGLE_DOCS_VIEWER_URL)) {
                        setIntervalAndCheckGoogleDocViewer(docViewerUrl);
                    }

                    element.on('load', function() {
                        shouldReset = false;
                        clearInterval(timer);
                    });
                }
            };
        }
    ]);
