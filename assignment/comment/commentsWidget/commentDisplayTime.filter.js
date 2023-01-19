angular.module('Realize.Comment.DisplayTime', [
    'rlzComponents.components.i18n',
    'Realize.filters.capitalizeFirstWord'
])
    .filter('commentDisplayTime', [
        'lwcI18nFilter',
        'capitalizeFirstWordFilter',
        function(lwcI18nFilter, capitalizeFirstWordFilter) {
        'use strict';
        return function(date) {
            date = moment.isMoment(date) ? date : moment(date);
            var today = moment(),
                differenceInDays = today.diff(date, 'days'),
                dayName,
                lastPrefix,
                localizedDayName;

            if (differenceInDays >= 13) {
                return date.format('MM/DD/YYYY');
            } else if (differenceInDays >= 7) {
                dayName = date.format('dddd');
                lastPrefix = lwcI18nFilter('comment.times.last');
                localizedDayName = capitalizeFirstWordFilter(dayName.toLowerCase());
                return lastPrefix + ' ' + localizedDayName;
            } else if (differenceInDays >= 2 && differenceInDays <= 6) {
                dayName = date.format('dddd');
                return capitalizeFirstWordFilter(dayName.toLowerCase());
            } else if (differenceInDays === 1 || (differenceInDays === 0 && today.day() !== date.day())) {
                return lwcI18nFilter('comment.times.yesterday');
            } else {
                return lwcI18nFilter('comment.times.today');
            }
        };
    }]);
