angular.module('RealizeDirectives')
    .directive('scoPlayer', [
        '$log',
        '$window',
        '$route',
        '$sce',
        'REST_PATH',
        'CONTENT_CONSTANTS',
        function($log, $window, $route, $sce, REST_PATH, CONTENT_CONSTANTS) {
            'use strict';

            var SCO_VERSION_IDENTIFIER = '2-',
                getScoUrl = function(userAssignmentId) {
                    var url = REST_PATH + '/v2/assignment/student/sco/' + SCO_VERSION_IDENTIFIER + userAssignmentId;
                    return url;
                },
                getScoReviewUrl = function(userAssignmentId) {
                    var url = getScoUrl(userAssignmentId) + '/review';
                    return url;
                };

            return {
                scope: {
                    sco: '=',
                    studentAttempt: '=',
                    review: '='
                },
                replace: true,
                template: [
                    '<iframe class="flexboxIosIframeResizeFix" ng-src="{{ url }}" ',
                        'width="{{ width }}" height="{{ height }}" frameBorder="0"></iframe>'
                ].join(''),
                controller: ['$scope', function($scope) {
                    $scope.$watch('sco', function(content, old) {
                        $log.log('scoPlayer content watch', content, old);
                        if (!content) { return; }

                        var findScoUrl = function() { //Not coming from assignment-related pages
                            // prefer content.url over item.attachments
                            if (content.url) {
                                return content.url;
                            }

                            var scoAttachment = _.find(content.attachments, function(attachment) {
                                return !attachment.url.match(/assignment\/student\/sco/);
                            });
                            if (scoAttachment && content.url) {
                                return scoAttachment.url;
                            } else {
                                $log.error('Cannot find url to launch SCO', content.attachments);
                            }
                        };

                        if ($scope.sco.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO) {
                            $scope.url = $scope.sco.url;
                        } else if ($scope.sco.mediaType === CONTENT_CONSTANTS.MEDIA_TYPE.RRSSCO) {
                            $scope.url = $sce.trustAsResourceUrl($scope.sco.url);
                        } else if ($scope.studentAttempt) {
                            $scope.url = $scope.review ? getScoReviewUrl($scope.studentAttempt) :
                                getScoUrl($scope.studentAttempt);
                        } else {
                            $scope.url = findScoUrl();
                        }

                        var jqWindow = angular.element($window),
                            navbarHeight = angular.element('.content-navbar').height(),
                            controlbarHeight = angular.element('.content-controlbar').height(),
                            responsive = (!content.renderSizeList || content.renderSizeList.length === 0),
                            resizeHeight = function() {
                                return ($window.innerHeight || jqWindow.height()) - navbarHeight - controlbarHeight;
                            },
                            resizeHandler = function() {
                                $scope.$applyAsync(function() {
                                    $scope.height = resizeHeight();
                                });
                            };

                        // no render size indicates responsive SCO
                        if (responsive) {
                            $scope.width = '100%';
                            $scope.height = resizeHeight();
                            jqWindow.on('resize', resizeHandler);
                        } else {
                            // copy the single set of render sizes so we can use the same template vars
                            $scope.width = content.renderSizeList[0].width;
                            $scope.height = content.renderSizeList[0].height;
                        }

                        $scope.$on('$destroy', function() {
                            jqWindow.off('resize', resizeHandler);
                        });
                    });
                }],
                link: function(scope, el) {
                    // remove iframe on page exit so IE doesn't keep playing audio
                    scope.$on('$destroy', function() {
                        el.src = '';
                        el.remove();
                    });
                }
            };
        }
    ]);

