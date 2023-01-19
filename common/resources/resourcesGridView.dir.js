angular.module('Realize.common.resources', [
        'Realize.paths',
        'realize-lib.ui.fallback-strategy'
    ])
    .directive('resourcesGridView', [
        'PATH',
        function(PATH) {
            'use strict';
            return {
                restrict: 'A',
                scope: {
                    resources: '=resources',
                    basePath: '@',
                    fallback: '='
                },
                templateUrl: PATH.TEMPLATE_ROOT + '/common/resources/resourcesGridView.dir.html',

                link: function(scope) {
                    scope.fallbackImageUrl = [scope.fallback];
                    scope.getImage = function(resource) {
                        // If it doesnt work, return no thumb.png by default in the getImage function
                        return (scope.basePath +  '/' + scope.format(resource) + '@2x.png');
                    };
                    // It will remove all spaces with underscore from the title
                    scope.format = function(title) {
                        return title.replace(/\s/g, '_');
                    };

                    scope.$on('fallbackStrategy.fallback.applied', function(event, fallbackEle) {
                        if (fallbackEle[0].src && fallbackEle[0].src.indexOf(event.targetScope.fallback) > -1) {
                            fallbackEle.parent().addClass(
                                'mediaIcon with-tab fallback-applied');
                        }
                    });

                    scope.showSelectedResource = function(event, selectedFeaturedResources) {
                        event.preventDefault();
                        event.stopPropagation();
                        scope.$emit('resourcesGridView.facet.filter.triggered', selectedFeaturedResources);
                    };
                }
            };
        }
    ]);
