angular.module('RealizeDirectives')

// replaces standard checkbox form elements with custom skinning
// while remaining accessible to screen readers and keyboard users
// @attr label-id - identifies the element containing the label. used to populate aria-labelledby
// @attr label - text that describes the checkbox
// @attr ng-model - tracks the value of the checkbox

// Usage:
// <input type="checkbox" checkbox-custom ng-model="{foo}" labelid="{myId}" label="{myLabel}" >
    .directive('checkboxCustom', [
        '$log',
        'KEY_CODES',
        function($log, KEY_CODES) {
            'use strict';

            return {
                require: 'ngModel',
                template: function(tElem, tAttrs) {
                    var template = [
                        '<div class="customCheckbox">',
                            '<input type="checkbox" ng-hide="true" tabindex="-1">',
                            '<i tabindex="{{tabIndexVal}}" class="customCheckboxInput"',
                                'role="checkbox" aria-labelledby="',
                                tAttrs.labelId, '" aria-checked="{{isChecked}}"></i>',
                            '<span ng-if="', tAttrs.label !== undefined , '" id="',
                            tAttrs.labelId, '" data-e2e-id="custom-checkbox-label" class="customCheckboxLabel"',
                            'aria-checked="{{ isChecked }}">', tAttrs.label, '</span>',
                        '</div>'
                    ].join('');

                    return template;
                },

                replace: true,
                scope: true,
                link: function(scope, el, attrs, ctrl) {
                    scope.isChecked = scope.$eval(attrs.ngModel);

                    var $customBox = el.find('i.customCheckboxInput'),
                        $input = el.find('input'),
                        toggleIcon,
                        toggleHandler,
                        indeterminateStateValue = 'mixed',
                        eventNamespace = '.checkboxCustom';

                    if (attrs.ngDisabled) {
                        attrs.$observe('ngDisabled', function(disabled) {
                            if (scope.$eval(disabled)) {
                                el.addClass('disabled');
                            } else {
                                el.removeClass('disabled');
                            }
                        });
                    }

                    if (attrs.name) {
                        $input.attr('name', attrs.name);
                    }

                    scope.tabIndexVal = attrs.tabIndex ? attrs.tabIndex : 0;

                    toggleIcon = function(value) {
                        if (attrs.customIcons) {
                            $customBox.removeClass(attrs.checkedIcon)
                                .removeClass(attrs.uncheckedIcon)
                                .removeClass(attrs.indeterminateIcon)
                                .addClass(value === indeterminateStateValue ?
                                    attrs.indeterminateIcon : (value ? attrs.checkedIcon : attrs.uncheckedIcon));
                        } else {
                            $customBox.removeClass('icon-check-empty')
                                .removeClass('icon-check')
                                .removeClass('icon-minus-sign-alt')
                                .addClass(value === indeterminateStateValue ?
                                    'icon-minus-sign-alt' : (value ? 'icon-check' : 'icon-check-empty'));
                        }

                    };

                    toggleHandler = function(event) {
                        if (event) {
                            event.preventDefault();
                            event.stopPropagation();
                        }

                        if (scope.$eval(attrs.ngDisabled)) { return; }

                        scope.isChecked = !ctrl.$viewValue;
                        ctrl.$setViewValue(scope.isChecked);

                        toggleIcon(ctrl.$viewValue);

                        scope.$applyAsync(function(self) {
                            if (attrs.callback) {
                                self[attrs.callback](attrs.id, ctrl.$viewValue);
                            }
                        });
                    };

                    scope.$watch(attrs.ngModel, function(val) {
                        toggleIcon(val);
                        scope.$parent[attrs.ngModel] = val;
                        if (val) {
                            ctrl.$setViewValue(val);
                            scope.isChecked = val;
                        }
                    });

                    // create handler on $custombox to update the model
                    $customBox.on('click' + eventNamespace, toggleHandler);
                    el.on('click' + eventNamespace, 'span.customCheckboxLabel', toggleHandler);

                    $customBox.on('keydown' + eventNamespace, function(checkboxKeyEvent) {
                        if (checkboxKeyEvent.which === KEY_CODES.SPACE) {
                            checkboxKeyEvent.preventDefault();
                            toggleHandler();
                        }
                    });

                    scope.$on('$destroy', function() {
                        $customBox.off(eventNamespace);
                        el.off('click' + eventNamespace, 'span.customCheckboxLabel', toggleHandler);
                    });
                }
            };
        }
    ]);
