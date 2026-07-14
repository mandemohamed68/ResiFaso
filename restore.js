import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                                <span>{d.getDate()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-4">`;

const replace = `                                <span>{d.getDate()}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Occupied Dates List - High visibility for user request */}
                        {(() => {
                          const activeBookings = selectedResidenceBookings.filter((b: any) => {
                            const bStatus = (b.bookingStatus || b.booking_status || b.status || '').toLowerCase();
                            return bStatus !== 'cancelled' && bStatus !== 'declined' && bStatus !== 'annulé' && bStatus !== 'refusé';
                          });

                          const occupiedList = [
                            ...activeBookings.map((b: any) => ({
                              from: (b.checkIn || b.check_in || '').split('T')[0],
                              to: (b.checkOut || b.check_out || '').split('T')[0]
                            })),
                            ...(selectedResidence.occupiedDates || []).map((d: any) => ({
                              from: (d.from || d.check_in || '').split('T')[0],
                              to: (d.to || d.check_out || '').split('T')[0]
                            }))
                          ].sort((a, b) => (a.from || '').localeCompare(b.from || ''));

                          if (occupiedList.length === 0) return null;

                          // Deduplicate identical ranges
                          const uniqueOccupiedList = occupiedList.filter((v, i, a) => a.findIndex(t => (t.from === v.from && t.to === v.to)) === i);

                          return (
                            <div className="mt-3 bg-red-50/50 p-3 rounded-2xl border border-red-100 mb-6">
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                Dates d'indisponibilité de la résidence :
                              </p>
                              <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                                {uniqueOccupiedList.map((occ, idx) => {
                                  const fromFr = new Date(occ.from).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                                  const toFr = new Date(occ.to).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                                  return (
                                    <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-red-50 text-[11px] font-bold text-slate-700">
                                      <span>Du <strong className="font-extrabold">{fromFr}</strong></span>
                                      <span className="text-red-300">➜</span>
                                      <span>Au <strong className="font-extrabold">{toFr}</strong></span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex gap-4">`;

content = content.replace(target, replace);
fs.writeFileSync('src/App.tsx', content);
