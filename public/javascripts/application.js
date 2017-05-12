/* global $ */
/* global GOVUK */

// Warn about using the kit in production
if (
  window.sessionStorage && window.sessionStorage.getItem('prototypeWarning') !== 'false' &&
  window.console && window.console.info
) {
  window.console.info('GOV.UK Prototype Kit - do not use for production')
  window.sessionStorage.setItem('prototypeWarning', true)
}

$(document).ready(function () {
  // Use GOV.UK shim-links-with-button-role.js to trigger a link styled to look like a button,
  // with role="button" when the space key is pressed.
  GOVUK.shimLinksWithButtonRole.init()

  // Show and hide toggled content
  // Where .multiple-choice uses the data-target attribute
  // to toggle hidden content
  var showHideContent = new GOVUK.ShowHideContent()
  showHideContent.init()

  var showHide = new ShowHide()
  showHide.init()

  var locationSelect = document.querySelector('#location');
  if (locationSelect) {
    AccessibleTypeahead.enhanceSelectElement({
      selectElement: document.querySelector('#location')
    })
  }

  new FoldableText('.summary', 200)
    .init()

})

var ShowHide = function() {
  this.selector = '.showHide'
  this.controlSelector = '.showHide-control'
  this.contentSelector = '.showHide-content'
  this.openSelector = '.showHide-open-all'
  this.expandSelector = '.expand'
  this.allOpen = false;
}

ShowHide.prototype = {
  toggle : function(event) {
    var parentShowHide = $(event.target).parents(this.selector)
    var isOpen = parentShowHide.data("isOpen")
    parentShowHide.data("isOpen", !isOpen)
    parentShowHide.find(this.contentSelector).toggle()
    parentShowHide.find(this.expandSelector).html(isOpen? '+' : '-');
  },
  toggleAll : function(event) {
    var showHideDataLinks = $(event.target).parents('.data-links')
    event.preventDefault()
    var allOpen = $(event.target).data("allOpen")
    if (allOpen) {
      showHideDataLinks.find(this.selector).data('isOpen', false)
      showHideDataLinks.find(this.contentSelector).hide()
      showHideDataLinks.find(this.expandSelector).html('+')
      $(event.target).data("allOpen", false)
      $(event.target).text('Open all')

    } else {
      showHideDataLinks.find(this.selector).data('isOpen', true)
      showHideDataLinks.find(this.contentSelector).show()
      showHideDataLinks.find(this.expandSelector).html('-')
      $(event.target).data("allOpen", true)
      $(event.target).text('Close all')
    }

  },

  init : function() {
    $(this.controlSelector).on('click', this.toggle.bind(this))
    $(this.controlSelector).first().trigger('click')
    $(this.openSelector).on('click', this.toggleAll.bind(this))
    $(this.selector).data("isOpen", false)
    $(this.openSelector).data("allOpen", false)
  }
}

function do_switch(previewer, appender, tab){
  $(previewer).empty().append($(appender).html());
  $('.tab').each(function(i, elem){
    $(elem).addClass('inactive');
    $(elem).removeClass('active');
  });
  $(tab).parent().removeClass('inactive');
  $(tab).parent().addClass('active');
  $(document).click();
  return false;
}

// ==== Foldable text ======================

var FoldableText = function (selector, size) {
  this.selector = selector
  this.els = $(this.selector)
  this.minSize = size
  return this
}

FoldableText.prototype.toggle = function(event) {
  const $target = $(event.target)
  if ($target.data('folded') === 'folded') {
    $target.text('Hide full summary')
    $target.prev(this.selector).height($target.data('height'))
    $target.data('folded', 'unfolded')
  } else {
    $target.text('View full summary')
    $target.prev(this.selector).height(this.minSize)
    $target.data('folded', 'folded')
  }
}

FoldableText.prototype.init = function() {
  $.each(this.els, (idx, el) => {
    const $el = $(el)
    $el.css('max-height','100000px')
    const originalHeight = $el.height()
    if (originalHeight > this.minSize) {
      $el
        .height(this.minSize)
        .css('overflow', 'hidden')
        .css('margin-bottom', 0)
        .wrap('<p class="fold-outer"></p>')

      $el.parent('p.fold-outer')
        .append('<div class="fold" data-folded="folded" data-height="'+originalHeight+'">View full summary</div>')

      $el.next('.fold').on('click', this.toggle.bind(this));
    }
  })
}
