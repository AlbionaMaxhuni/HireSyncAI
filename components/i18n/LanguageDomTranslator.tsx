'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { translateText } from '@/lib/i18n/translations'

const translatableAttributes = ['aria-label', 'placeholder', 'title', 'alt'] as const

function shouldSkipNode(node: Node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  return Boolean(element?.closest('script, style, code, pre, textarea, [data-i18n-skip]'))
}

function translateTextNode(node: Text, language: ReturnType<typeof useLanguage>['language']) {
  const value = node.nodeValue
  if (!value || !value.trim() || shouldSkipNode(node)) return

  const translated = translateText(value, language)
  if (translated !== value) {
    node.nodeValue = translated
  }
}

function translateElementAttributes(element: Element, language: ReturnType<typeof useLanguage>['language']) {
  if (shouldSkipNode(element)) return

  for (const attribute of translatableAttributes) {
    const value = element.getAttribute(attribute)
    if (!value) continue

    const translated = translateText(value, language)
    if (translated !== value) {
      element.setAttribute(attribute, translated)
    }
  }
}

function translateTree(root: ParentNode, language: ReturnType<typeof useLanguage>['language']) {
  if (root instanceof Element) {
    translateElementAttributes(root, language)
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let currentTextNode = textWalker.nextNode()

  while (currentTextNode) {
    translateTextNode(currentTextNode as Text, language)
    currentTextNode = textWalker.nextNode()
  }

  if ('querySelectorAll' in root) {
    root.querySelectorAll('*').forEach((element) => translateElementAttributes(element, language))
  }
}

export default function LanguageDomTranslator() {
  const { language } = useLanguage()

  useEffect(() => {
    translateTree(document.body, language)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          translateTextNode(mutation.target as Text, language)
          continue
        }

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          translateElementAttributes(mutation.target, language)
          continue
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text, language)
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            translateTree(node as Element, language)
          }
        })
      }
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...translatableAttributes],
      characterData: true,
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [language])

  return null
}

