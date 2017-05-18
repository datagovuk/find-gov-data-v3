module.exports = function (env) {
  /**
   * Instantiate object used to store the methods registered as a
   * 'filter' (of the same name) within nunjucks. You can override
   * gov.uk core filters by creating filter methods of the same name.
   * @type {Object}
   */
  var filters = {}

  /* ------------------------------------------------------------------
    add your methods to the filters obj below this comment block:
    @example:

    filters.sayHi = function(name) {
        return 'Hi ' + name + '!'
    }

    Which in your templates would be used as:

    {{ 'Paul' | sayHi }} => 'Hi Paul'

    Notice the first argument of your filters method is whatever
    gets 'piped' via '|' to the filter.

    Filters can take additional arguments, for example:

    filters.sayHi = function(name,tone) {
      return (tone == 'formal' ? 'Greetings' : 'Hi') + ' ' + name + '!'
    }

    Which would be used like this:

    {{ 'Joel' | sayHi('formal') }} => 'Greetings Joel!'
    {{ 'Gemma' | sayHi }} => 'Hi Gemma!'

    For more on filters and how to write them see the Nunjucks
    documentation.

  ------------------------------------------------------------------ */

  filters.sortedByDisplay = function(option) {
    switch (option) {
      case 'recent':
        return 'Most recent'
        break;
      case 'viewed':
        return 'Most viewed'
        break;
      case 'best':
        return 'Best match'
        break;
    }
  }

  filters.orgTypDisplay = function(orgTypes) {
    var types = orgTypes.map(function(abreviation){
      if (abreviation == 'central-gov') {
        return 'Central Government'
      } else if (abreviation =='local-auth') {
        return 'Local Authorities'
      } else {
        return 'Other government bodies'
      }
    })
      if (types.length == 1) {
        return types[0]
      } else if (types.length == 2) {
        return `${types[0]}' <span class="normal">or</span> '${types[1]}`
      } else {
        return `${types[0]}', '${types[1]}' <span class="normal">or</span>'${types[2]}`
      }
    }


  /* ------------------------------------------------------------------
    keep the following line to return your filters to the app
  ------------------------------------------------------------------ */
  return filters
}
