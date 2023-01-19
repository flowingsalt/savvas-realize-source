angular.module('Realize.common.ltiContentViewerDirective', [
    'Realize.paths'
])
    .directive('rlzLtiContentViewer', [
        'PATH',
        '$timeout',
        '$sce',
        function(PATH, $timeout, $sce) {
            'use strict';

            return {
                restrict: 'EA',
                scope: {
                    launchUrl: '@',
                    //array of key/value pairs: [ {key: name, value: 'bob'}, ... ]
                    //or object hash: { name: 'bob', color: 'red', ... }
                    launchParams: '=',
                    //boolean
                    launchInNewWindow: '@?',
                    //label to use to tell use to click to open in new window
                    launchLabel: '@?',
                    //url for a thumbnail image
                    launchThumbUrl: '@?',
                    //alt for thumbnail image
                    launchThumbAlt: '@?',
                    // boolean to check if assignment available
                    launchStatus: '@?',
                    // title to display if assignment not available
                    launchAssignmentTitle: '@?',
                },
                templateUrl: [
                    PATH.TEMPLATE_ROOT,
                    'common',
                    'ltiContentViewer',
                    'ltiContentViewer.dir.html'
                ].join('/'),
                link: function(scope, el) {
                    var form = el.find('form.lti-launch-form')[0],
                        timer;
                    if (scope.launchParams) {
                        if (!Array.isArray(scope.launchParams)) {
                            scope.formFields = Object.keys(scope.launchParams).map(function(key) {
                                return {key: key, value: scope.launchParams[key]};
                            });
                        } else {
                            scope.formFields = scope.launchParams;
                        }
                    }
                    scope.$watch('launchUrl', function(newValue) {
                        scope.trustedLaunchUrl = $sce.trustAsResourceUrl(newValue);
                    });

                    scope.hasThumbnail = (scope.launchThumbUrl || '') !== '';

                    scope.isNewWindowLaunch = (scope.launchInNewWindow || '').toLowerCase() === 'true';

                    scope.hasAssignmentId = scope.launchStatus !== 'false';

                    scope.isOpenEdcontent = scope.launchLabel === 'OpenEd';

                    scope.isContentItemAssigned = scope.isNewWindowLaunch && scope.hasAssignmentId;

                    if (scope.isNewWindowLaunch) {
                        form.target = '_blank';
                        scope.launchLti = function() {
                            form.submit();
                        };
                    } else {
                        //defaults to iframe
                        //timeout to allow fields to render into the form
                        timer = $timeout(function() {
                            form.submit();
                        }, 10);
                    }

                    scope.$on('$destroy', function destroy() {
                        $timeout.cancel(timer);
                    });
                }
            };
        }]);
