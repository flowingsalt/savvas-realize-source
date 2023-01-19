angular.module('Realize.classRoster.classRosterTheme', [
    'Realize.paths',
    'Realize.classRosterThemes.constants'
])
    .directive('classRosterTheme', [
        'PATH',
        'CLASS_ROSTER_THEMES',
        function(PATH, CLASS_ROSTER_THEMES) {
        'use strict';
        return {
            scope: {
                classReference: '=',
                form: '=',
            },
            controller: function() {
                this.themes = CLASS_ROSTER_THEMES;
                this.setSelectedTheme = function(option) {
                    this.classReference.learningExperience = option;
                    this.form.$setDirty();
                };
            },
            bindToController: true,
            controllerAs: 'classRosterThemeCtrl',
            templateUrl: PATH.TEMPLATE_ROOT + '/classRoster/classRosterTheme.dir.html'
        };
    }]);
