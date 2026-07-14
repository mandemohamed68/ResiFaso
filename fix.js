const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                                <span>{d.getDate()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-4">`;

const current = `                               </div>                      })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex gap-4">`;

content = content.replace(current, target);
fs.writeFileSync('src/App.tsx', content);
