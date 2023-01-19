angular.module('Realize.classRosterThemes.constants', [])
    .constant('CLASS_ROSTER_THEMES', [
        {
            name: 'Standard',
            label: 'earlyLearner.chooseExperienceSteps.option1',
            image_class:'experience-standard'
        },
        {
            name: 'EarlyLearner',
            label: 'earlyLearner.chooseExperienceSteps.option2',
            image_class: 'experience-early-learner'
        }
    ])
    .constant('EARLY_LEARNER_CONSTANTS', {
        THEME_EARLY_LEARNER: 'EarlyLearner',
        THEME_STANDARD: 'Standard',
        PROFILE_KEY: 'profile.learningExperience'
    });
