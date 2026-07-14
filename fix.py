import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

import re

# Find the location of: isBooked ? "bg-red-100...
# and replace everything up to <div className="flex gap-4">

content = re.sub(r'(isBooked \? "bg-red-100[^"]+" : "bg-emerald-50[^"]+"\s*\)\s*\}\s*>).*?(<div className="flex gap-4">)', r'\1\n                                <span>{d.getDate()}</span>\n                              </div>\n                            );\n                          })}\n                        </div>\n                      </div>\n                      \2', content, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)
