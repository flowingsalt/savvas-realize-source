angular.module('RealizeApp')
    .controller('ProgramCtrl',
        [
            '$scope',
            '$location',
            'Content',
            'RootTierContent',
            'MyContent',
            'MediaQuery',
            'OptionalFeatures',
            function($scope, $location, Content, RootTierContent, MyContent, MediaQuery, OptionalFeatures) {
                'use strict';

                $scope.currentUser.setAttribute('programs.visited', true);

                // we know this is a program
                $scope.content = $scope.program = RootTierContent;

                $scope.isCentersContent = $location.path().indexOf('/center/') >= 0;

                $scope.openEditView = function() {
                    var next = $location.path() + '/edit';
                    $location.path(next).search('forceOriginalView', null);
                };

                $scope.openOriginalView = function() {
                    var program = $scope.content;
                    MyContent.getOriginalIdFromCustomized(program.id).then(function(data) {
                        var path = $location.path(),
                        next = path.split('/program')[0] + '/program/' + data.originalItemId + '/0';
                        $location.path(next).search('forceOriginalView', 'true');
                    });
                };

                $scope.openCustomizedView = function() {
                    var customizedProgram = $scope.content.customizedItem;
                    var path = $location.path();
                    var next = path.split('/program')[0] + '/program/' + customizedProgram.id + '/' +
                        customizedProgram.version;
                    $location.path(next).search('forceOriginalView', null);
                };

                $scope.isCustomized = $scope.content.contribSource === 'My Uploads';
                $scope.isOriginal = !$scope.isCustomized;
                $scope.showOriginal = !$scope.content.customizedItemDefaultView;

                $scope.isMixedMode = function(tocView) {
                    return tocView === 'list' && $scope.sidebarOpen && !MediaQuery.breakpoint.isDesktop;
                };

                $scope.back = function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    // root TOC
                    if ($scope.content.root) {
                        /**
                         * if in read-only view for original toc, then back
                         * takes you to customized version; else, it's the programs list page
                         */
                        if ($scope.isOriginal && !$scope.showOriginal) {
                            $scope.goBack('/program/' + $scope.content.customizedItem.id + '/' +
                                $scope.content.customizedItem.version, true);
                        } else {
                            $scope.goBack('/program', true);
                        }
                    } else {
                        // there is a specific place to go...
                        $scope.goBack('/program', true);
                    }
                };

                // setting boolean flag to check if BuildETextFeature is enable or not
                $scope.hasBuildETextFeature = OptionalFeatures.isAvailable('buildEText.feature.enabled');
            }
        ]
    );
