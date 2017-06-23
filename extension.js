'use strict'
const vscode = require( 'vscode' )
const standardFormat = require( 'standard-format' )

const replaceEqualSymbol = ( text ) => {
  const regexAfterEqual = /\=(\>?)(\b|\[|\(|\{)/g
  const regexBeforeEqual = /(\b|\]|\)|\})\=/g
  return text.replace( regexAfterEqual, `=$1 $2` ).replace( regexBeforeEqual, `$1 =` )
}

const replaceFunction = ( text ) => {
  const regexAfterFunction = /function(\w|\()/g
  const regexAfterFunctionName = /function (\w+|\()(\()/g
  return text.replace( regexAfterFunction, `function $1` ).replace( regexAfterFunctionName, `function $1 $2` )
}

const replaceCommaAndColon = ( text ) => {
  const regexCommaAndColon = /(\:|\,)(\b|\(|\{|\[|\'|\"|\`)/g
  return text.replace( regexCommaAndColon, `$1 $2` )
}

const replaceParenthesisAndBrackets = ( text ) => {
  const regexOpeningParenthesisAndBrackets = /(\{|\(|\[)(\b|\(|\'|\`|\"|\{|\[)/g
  const regexClosingParenthesisAndBrackets = /(\b|\)|\'|\`|\"|\}|\])(\}|\]|\))/g
  const fixNestedOpeningParenthesisAndBrackets = /(\{|\(|\[)(\{|\(|\[)/g
  const fixNestedClosingParenthesisAndBrackets = /(\}|\]|\))(\}|\]|\))/g
  return text.replace( fixNestedClosingParenthesisAndBrackets, `$1 $2` )
    .replace( fixNestedOpeningParenthesisAndBrackets, `$1 $2` )
    .replace( regexOpeningParenthesisAndBrackets, `$1 $2` )
    .replace( regexClosingParenthesisAndBrackets, `$1 $2` )
}

const removeSemiColon = ( text ) => {
  const regexSemiColon = /(;)(\n)/g
  return text.replace( regexSemiColon, `$2` )
}

const removeMultiLine = ( text ) => {
  const regexMultiLine = /(.)(\n\n)(\n)+/g
  return text.replace( regexMultiLine, `$1$2` )
}

const replaceInfix = ( text ) => {
  const regexInfixQuotesLeft = /((\"|\'|\`)[a-zA-Z0-9\+\-\%\/\*\s]+(\"|\'|\`))(\+)/g
  const regexInfixQuotesRight = /(\+)((\"|\'|\`)[a-zA-Z0-9\+\-\%\/\*\s]+(\"|\'|\`))/g
  const regexInfixLeft = /(\S+)(\+|\-|\/|\*|\%)/g
  const regexInfixRight = /(\+|\-|\/|\*|\%)(\S+)/g
  return text.replace( regexInfixQuotesLeft, `$1 $4` )
    .replace( regexInfixQuotesRight, `$1 $2` )
    .replace( regexInfixLeft, ( str, p1, p2 ) => {
      if ( str.indexOf( "'" ) != -1 || str.indexOf( '"' ) != -1 || str.indexOf( '`' ) != -1 || p1.charAt( p1.length - 1 ) === p2 )
        return str
      return p1 + ' ' + p2
    } ).replace( regexInfixRight, ( str, p1, p2 ) => {
    if ( str.indexOf( "'" ) != -1 || str.indexOf( '"' ) != -1 || str.indexOf( '`' ) != -1 || p1.charAt( p1.length - 1 ) === p2 )
      return str
    return p1 + ' ' + p2 } )
}

function suissize ( option ) {
  const editor = vscode.window.activeTextEditor
  if (!editor ) return

  vscode.commands.executeCommand( 'acceptSelectedSuggestion' ).then( () => {
    let range
    let currentText
    if ( option === 'formatLine' ) {
      const lineIndex = editor.selection.active.line
      const lineObject = editor.document.lineAt( lineIndex )
      const lineLength = lineObject.text.length
      const start = new vscode.Position( lineIndex, 0 )
      const end = new vscode.Position( lineIndex, lineLength )
      range = new vscode.Range( start, end )
      currentText = lineObject.text
    } else {
      const document = editor.document
      const start = new vscode.Position( 0, 0 )
      const end = new vscode.Position( document.lineCount - 1,
        document.lineAt( document.lineCount - 1 ).text.length )
      range = new vscode.Range( start, end )
      currentText = editor.document.getText( range )
    }

    let options = vscode.FormattingOptions
    if (!options ) {
      options = { insertSpaces: true, tabSize: 2 }
    }
    let regexArray
    if (!currentText.isEmptyOrWhitespace ) {
      let insertionSuccess = editor.edit( ( editBuilder ) => {
        let formatted
        if ( option === 'formatIndentCode' ) {
          try {
            formatted = standardFormat.transform( currentText )
          } catch ( err ) {
            vscode.window.showErrorMessage( err.message )
            return
          }
          regexArray = formatted.match(/\/.*\/\s?\w*/g )
          formatted = replaceParenthesisAndBrackets( formatted )
        } else {
          regexArray = currentText.match(/\/.*\/\s?\w*/g )
          formatted = removeMultiLine(
            replaceParenthesisAndBrackets(
              replaceCommaAndColon(
                removeSemiColon(
                  replaceInfix(
                    replaceFunction(
                      replaceEqualSymbol( currentText )
                    )
                  )
                )
              )
            )
          )
        }
        if ( regexArray != null && regexArray.length > 0 ) {
          let positionArray = 0
          formatted = formatted.replace(/\/.*\/\s?\w*/g, ( str ) => {
            positionArray++
            return regexArray[ positionArray - 1 ]
          } )
        }
        editBuilder.replace( range, formatted )
      } )

      if (!insertionSuccess ) return
    }

    if ( option === 'formatLine' ) return vscode.commands.executeCommand( 'editor.action.insertLineAfter' )
  } )
}

function activate ( context ) {
  const formatLine = vscode.commands.registerCommand( 'suissize.formatLine', () => {
    suissize( 'formatLine' )
  } )

  const formatCode = vscode.commands.registerCommand( 'suissize.formatCode', () => {
    suissize( 'formatCode' )
  } )

  const formatIndentCode = vscode.commands.registerCommand( 'suissize.formatIndentCode', () => {
    suissize( 'formatIndentCode' )
  } )

  context.subscriptions.push( formatLine )
  context.subscriptions.push( formatCode )
  context.subscriptions.push( formatIndentCode )
}

exports.activate = activate
