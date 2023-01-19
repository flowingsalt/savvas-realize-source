angular.module('Realize.assessment.standardWithBankItemDirective', [
    'Realize.standards.standardDataService'
])
    .directive('standardWithBankItem', [
        'Standard',
        function(StandardService) {
            'use strict';

            return {
                link: function(scope) {
                    var standard = scope.obj;

                    scope.toggle = function() {
                        if (scope.obj.children.length > 0) {
                            scope.obj.expanded = !scope.obj.expanded;
                        }
                    };

                    scope.$watch('obj.expanded', function(isExpanded) {
                        StandardService[(isExpanded) ? 'setOpen' : 'setClosed'](standard.id);
                        if (!isExpanded && standard.children) {
                            _.each(standard.children, function(child) {
                                child.expanded = false;
                            });
                        }
                    });

                    if (scope.level === 0) {
                        standard.expanded = true;
                    }
                }
            };
        }
    ]);
